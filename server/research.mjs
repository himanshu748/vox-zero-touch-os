import { z } from 'zod';

// Fixed search host, bounded query count, validated HTTPS result links. No arbitrary fetch tool.
export async function searchGuidance(ticket, {fetchImpl=fetch,signal}={}) {
  if (!process.env.SERPAPI_API_KEY) return null;
  const input=z.object({id:z.string().min(1),title:z.string().min(1).max(10000)}).parse(ticket);
  const query=`${input.title.slice(0,160)} official documentation troubleshooting`;
  const url=new URL('https://serpapi.com/search.json');
  url.search=new URLSearchParams({engine:'google',q:query,num:'3',api_key:process.env.SERPAPI_API_KEY}).toString();
  const start=Date.now();
  let response;
  try {response=await fetchImpl(url,{signal:AbortSignal.any([AbortSignal.timeout(30000),...(signal?[signal]:[])])});}
  catch {throw new Error('Live research could not reach SerpApi. Saved work remains available.');}
  if (!response.ok) throw new Error(`SerpApi research failed (HTTP ${response.status}).`);
  const reader=response.body.getReader(),chunks=[];
  let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024*1024){await reader.cancel();throw new Error('SerpApi response exceeded its size limit.');}chunks.push(Buffer.from(value));}
  let data;
  try{data=z.object({search_metadata:z.object({id:z.string().min(1),status:z.literal('Success')}),organic_results:z.array(z.unknown()).default([]),error:z.unknown().optional()}).parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));}
  catch{throw new Error('SerpApi did not return a successful search.');}
  if (data.error) throw new Error('SerpApi did not return a successful search.');
  const sources=(data.organic_results||[]).slice(0,3).flatMap(item=>{
    const parsed=z.object({title:z.string().min(1).max(500),link:z.string().url(),snippet:z.string().max(5000).optional()}).safeParse(item);
    if (!parsed.success || new URL(parsed.data.link).protocol!=='https:') return [];
    const link=new URL(parsed.data.link);
    if(link.username || link.password) return [];
    return [{title:parsed.data.title,url:parsed.data.link,content:parsed.data.snippet||'',kind:'live SerpApi search result',retrievedAt:new Date().toISOString(),ticketId:input.id,searchId:data.search_metadata.id}];
  });
  if (!sources.length) throw new Error('SerpApi returned no usable sources. No live research is claimed.');
  return {sources,receipt:{provider:'SerpApi',operation:'research',model:'google',requestId:data.search_metadata.id,query,latencyMs:Date.now()-start,httpStatus:response.status,cost:null,createdAt:new Date().toISOString()}};
}
