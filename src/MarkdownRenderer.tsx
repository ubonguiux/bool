import { Fragment, ReactNode } from 'react';

function inline(text:string):ReactNode[]{
 const parts:ReactNode[]=[];
 const pattern=/\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
 let last=0;let match:RegExpExecArray|null;let i=0;
 while((match=pattern.exec(text))!==null){
  if(match.index>last)parts.push(text.slice(last,match.index));
  if(match[1])parts.push(<strong key={i++}>{match[1]}</strong>);
  else if(match[2])parts.push(<em key={i++}>{match[2]}</em>);
  else if(match[3]&&match[4])parts.push(<a key={i++} href={match[4]} target={match[4].startsWith('http')?'_blank':undefined} rel={match[4].startsWith('http')?'noreferrer':undefined}>{match[3]}</a>);
  last=pattern.lastIndex;
 }
 if(last<text.length)parts.push(text.slice(last));
 return parts;
}
export default function MarkdownRenderer({content}:{content:string}){
 const lines=content.replace(/\r\n/g,'\n').split('\n');
 const blocks:ReactNode[]=[];let paragraph:string[]=[];let listItems:string[]=[];let listType:'ul'|'ol'|null=null;
 const flushParagraph=()=>{if(paragraph.length){blocks.push(<p key={'p'+blocks.length}>{inline(paragraph.join(' '))}</p>);paragraph=[];}};
 const flushList=()=>{if(listItems.length&&listType){const Tag=listType;blocks.push(<Tag key={'l'+blocks.length}>{listItems.map((item,i)=><li key={i}>{inline(item)}</li>)}</Tag>);listItems=[];listType=null;}};
 for(const raw of lines){
  const line=raw.trim();
  if(!line){flushParagraph();flushList();continue;}
  const heading=line.match(/^(#{1,3})\s+(.+)$/);
  if(heading){flushParagraph();flushList();const level=heading[1].length;const text=heading[2];if(level===1)blocks.push(<h1 key={'h'+blocks.length}>{inline(text)}</h1>);else if(level===2)blocks.push(<h2 key={'h'+blocks.length}>{inline(text)}</h2>);else blocks.push(<h3 key={'h'+blocks.length}>{inline(text)}</h3>);continue;}
  if(/^---+$/.test(line)){flushParagraph();flushList();blocks.push(<hr key={'hr'+blocks.length}/>);continue;}
  const bullet=line.match(/^[-*]\s+(.+)$/);const numbered=line.match(/^\d+[.)]\s+(.+)$/);
  if(bullet||numbered){flushParagraph();const nextType=bullet?'ul':'ol';if(listType&&listType!==nextType)flushList();listType=nextType;listItems.push((bullet||numbered)![1]);continue;}
  flushList();paragraph.push(line);
 }
 flushParagraph();flushList();
 return <div className="markdown-renderer">{blocks.map((b,i)=><Fragment key={i}>{b}</Fragment>)}</div>;
}
