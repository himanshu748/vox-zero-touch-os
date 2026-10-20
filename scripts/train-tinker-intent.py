"""Bounded, reproducible SFT. Requires explicit --run; only synthetic fixtures are sent.

The caller supplies TINKER_API_KEY and an output directory kept outside Git.
No checkpoint is published. One sampler checkpoint expires after seven days.
"""
import argparse, hashlib, json, os, time
from pathlib import Path
import tinker

SYSTEM = ('Normalize a synthetic support command into JSON with exactly research (boolean), '
          'drafts (integer 0 to 6), tag (boolean). Triage is always implicit. Drafting needs research. '
          'Draft zero if no replies are requested; default to two if a count is not stated. '
          '"A reply" or "one reply" means one. Research means looking up fixes or sources. '
          'Do not interpret "no drafts" as a drafting request. Tags mean internal labels only. '
          'Sending is never authorized. Return only the JSON object, with no prose.')
BASE = 'Qwen/Qwen3-8B'
EPOCHS, OUTPUT_LIMIT, TTL = 12, 96, 7 * 24 * 3600

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--run', action='store_true')
    args = parser.parse_args()
    fixture = Path(__file__).with_name('tinker-intent-data.json')
    raw = fixture.read_bytes(); data = json.loads(raw)
    report = {'datasetVersion': data['version'], 'datasetSha256': hashlib.sha256(raw).hexdigest(),
              'baseModel': BASE, 'epochs': EPOCHS, 'rank': 8, 'maxOutputTokens': OUTPUT_LIMIT,
              'checkpointTtlSeconds': TTL, 'maximumPromotionalUsd': 0.25, 'testRows': len(data['test'])}
    out = Path(args.output); out.mkdir(parents=True, exist_ok=True, mode=0o700)
    def save_private(name, value):
        fd = os.open(out / name, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as handle:
            json.dump(value, handle, indent=2)
    if not args.run:
        print(json.dumps(report)); return
    if not os.getenv('TINKER_API_KEY'): raise RuntimeError('TINKER_API_KEY is missing')
    service = tinker.ServiceClient(display_name='VOX synthetic intent SFT', user_metadata={'project':'VOX', 'dataset':data['version']})
    capabilities = service.get_server_capabilities()
    if BASE not in [model.model_name for model in capabilities.supported_models]:
        raise RuntimeError('The selected model is not available; no training started')
    baseline=service.create_sampling_client(base_model=BASE)
    tokenizer = baseline.get_tokenizer()
    def messages(command, answer=None):
        result=[{'role':'system','content':SYSTEM},{'role':'user','content':command}]
        if answer is not None: result.append({'role':'assistant','content':answer})
        return result
    def prompt(command):
        return tokenizer.apply_chat_template(messages(command), tokenize=False, add_generation_prompt=True, enable_thinking=False)
    def target(row): return {'research':row[1], 'drafts':row[2], 'tag':row[3]}
    training_data=[]; train_tokens=0
    for row in data['train']:
        prefix=prompt(row[0])
        # Keep the no-thinking generation prefix identical for training and evaluation.
        completion=json.dumps(target(row),separators=(',',':')) + tokenizer.eos_token
        p=tokenizer.encode(prefix,add_special_tokens=False); a=tokenizer.encode(completion,add_special_tokens=False)
        ids=p+a; weights=[0.0]*len(p)+[1.0]*len(a)
        training_data.append(tinker.Datum(model_input=tinker.ModelInput.from_ints(ids[:-1]),loss_fn_inputs={'target_tokens':ids[1:],'weights':weights[1:]}))
        train_tokens+=len(ids)
    eval_input=sum(len(tokenizer.encode(prompt(row[0]),add_special_tokens=False)) for row in data['test'])*2
    # Published Qwen3-8B rates: $0.44/M train, $0.195/M input, $0.60/M output.
    maximum_tokens_cost=(train_tokens*EPOCHS*0.44+eval_input*0.195+len(data['test'])*2*OUTPUT_LIMIT*0.60)/1e6
    report.update({'trainingTokensUpperBound':train_tokens*EPOCHS,'inferenceInputTokensUpperBound':eval_input,'maximumTokenUsd':maximum_tokens_cost,'storageReserveUsd':0.02})
    if maximum_tokens_cost+0.02>0.25: raise RuntimeError('Prepared job exceeds the promotional cost cap')
    save_private('budget.json', report)
    def evaluate(client):
        results=[]
        for row in data['test']:
            ids=tokenizer.encode(prompt(row[0]),add_special_tokens=False); started=time.monotonic()
            result=client.sample(prompt=tinker.ModelInput.from_ints(ids),num_samples=1,sampling_params=tinker.SamplingParams(max_tokens=OUTPUT_LIMIT,temperature=0)).result()
            sequence=result.sequences[0]; text=tokenizer.decode(sequence.tokens,skip_special_tokens=True).strip()
            try: parsed=json.loads(text)
            except (ValueError,TypeError): parsed=None
            results.append({'command':row[0],'expected':target(row),'actual':parsed,'correct':parsed==target(row),'outputTokens':len(sequence.tokens),'latencyMs':round((time.monotonic()-started)*1000),'stopReason':sequence.stop_reason})
        return results
    before=evaluate(baseline)
    save_private('baseline.json', before)
    training = service.create_lora_training_client(base_model=BASE, rank=8, seed=1729)
    for epoch in range(EPOCHS):
        forward=training.forward_backward(training_data,'cross_entropy')
        optim=training.optim_step(tinker.AdamParams(learning_rate=2e-4))
        forward.result(); optim.result()
        print(json.dumps({'epoch':epoch+1,'of':EPOCHS}),flush=True)
    checkpoint=training.save_weights_for_sampler('vox-intent-v1',ttl_seconds=TTL,user_metadata={'project':'VOX','datasetSha256':report['datasetSha256']}).result()
    save_private('checkpoint-private.json', {'modelPath':checkpoint.path,'expiresInSeconds':TTL})
    tuned=service.create_sampling_client(model_path=checkpoint.path)
    after=evaluate(tuned)
    save_private('fine-tuned.json', after)
    for name, rows in [('baseline',before),('fineTuned',after)]:
        report[name]={'correct':sum(row['correct'] for row in rows),'total':len(rows),'accuracy':sum(row['correct'] for row in rows)/len(rows),'outputTokens':sum(row['outputTokens'] for row in rows),'medianLatencyMs':sorted(row['latencyMs'] for row in rows)[len(rows)//2]}
    report['completedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
    save_private('evaluation.json', report)
    print(json.dumps(report),flush=True)

if __name__=='__main__': main()
