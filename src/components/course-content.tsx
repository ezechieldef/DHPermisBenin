import { useMemo, type ReactNode } from 'react';
import { Image, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { COURSE_IMAGES, COURSE_IMAGE_RATIOS } from '@/src/services/course-images';
import type { Definition } from '@/src/types/models';
import type { ViewerImage } from '@/src/components/course-image-viewer';

const clean = (text:string) => text.replace(/\*\*/g,'').replace(/`/g,'').trim();
const wordChar = (value:string|undefined) => Boolean(value && /[\p{L}\p{N}]/u.test(value));
const escape = (value:string) => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/[’']/g,"[’']").replace(/\s+/g,'\\s+');

function RichText({ text, definitions, onDefinitionPress, className }:{text:string;definitions:Definition[];onDefinitionPress?:(definition:Definition)=>void;className:string}) {
  const matcher=useMemo(()=>definitions.length?new RegExp(`(${definitions.map(item=>escape(item.mot)).join('|')})`,'giu'):null,[definitions]);
  if(!matcher)return <Text className={className}>{clean(text)}</Text>;
  const value=clean(text); const parts:ReactNode[]=[]; let cursor=0; let match:RegExpExecArray|null;
  while((match=matcher.exec(value))){const start=match.index,end=start+match[0].length;
    if(wordChar(value[start-1])||wordChar(value[end]))continue;
    if(start>cursor)parts.push(value.slice(cursor,start));
    const normalized=match[0].toLocaleLowerCase('fr').replace(/’/g,"'").replace(/\s+/g,' ');
    const definition=definitions.find(item=>item.mot.toLocaleLowerCase('fr').replace(/’/g,"'").replace(/\s+/g,' ')===normalized);
    parts.push(<Text key={`${start}-${match[0]}`} accessibilityRole="button" accessibilityHint="Affiche la définition" onPress={()=>definition&&onDefinitionPress?.(definition)} style={{textDecorationLine:'underline',textDecorationStyle:'dotted'}} className="text-primary">{match[0]}</Text>);
    cursor=end;
  }
  if(cursor<value.length)parts.push(value.slice(cursor));
  return <Text className={className}>{parts}</Text>;
}

export function CourseContent({ markdown, definitions=[], onDefinitionPress, onImagePress, activeRange, listening=false, onBlockLayout, lineOffset=0 }: { markdown: string;definitions?:Definition[];onDefinitionPress?:(definition:Definition)=>void;onImagePress?:(image:NonNullable<ViewerImage>)=>void;activeRange?:{startLine:number;endLine:number}|null;listening?:boolean;onBlockLayout?:(line:number,y:number)=>void;lineOffset?:number }) {
  const lines=markdown.split('\n'); const nodes:ReactNode[]=[]; let paragraph:string[]=[];
  let paragraphStart=1;
  const rich=(text:string,className:string,key:string)=><RichText key={key} text={text} definitions={definitions} onDefinitionPress={onDefinitionPress} className={className}/>;
  const push=(node:ReactNode,line:number)=>{const active=!listening||!activeRange||(line>=activeRange.startLine&&line<=activeRange.endLine);nodes.push(<View key={`block-${line}-${nodes.length}`} onLayout={(event)=>onBlockLayout?.(line,event.nativeEvent.layout.y)} style={{opacity:active?1:0.24}}>{node}</View>);};
  const flush=()=>{if(paragraph.length){push(rich(paragraph.join(' '),'mb-4 text-base leading-7 text-ink',`p-${nodes.length}`),paragraphStart);paragraph=[];}};
  for(let lineIndex=0;lineIndex<lines.length;lineIndex++){const raw=lines[lineIndex];const sourceLine=lineIndex+1+lineOffset;const line=raw.trim(); if(!line){flush();continue;}
    const image=line.match(/^!\[([^\]]*)\]\(([^)]+)\)/); if(image){flush();const name=image[2].split('/').pop()!;const source=COURSE_IMAGES[name];const aspectRatio=COURSE_IMAGE_RATIOS[name]??1;if(source)push(<Pressable accessibilityLabel={`Ouvrir l’illustration ${image[1]}`} accessibilityHint="Affiche l’image en plein écran avec zoom" onPress={()=>onImagePress?.({source,title:image[1]||'Illustration du cours',aspectRatio})} className="mb-5 w-full overflow-hidden rounded-3xl border border-border bg-white p-2 active:opacity-80"><Image source={source} style={{width:'100%',aspectRatio}} resizeMode="contain"/><View className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-black/60"><Text className="text-xl text-white">⌕</Text></View></Pressable>,sourceLine);continue;}
    if(line.startsWith('### ')){flush();push(<Text className="mb-3 mt-5 text-xl font-black uppercase text-ink">{clean(line.slice(4)).toLocaleUpperCase('fr-FR')}</Text>,sourceLine);continue;}
    if(line.startsWith('## ')){flush();push(<Text className="mb-4 mt-7 text-2xl font-black uppercase text-primary">{clean(line.slice(3)).toLocaleUpperCase('fr-FR')}</Text>,sourceLine);continue;}
    if(line.startsWith('# ')){flush();continue;}
    if(line.startsWith('> ')){flush();push(<View className="mb-5 rounded-2xl border-l-4 border-secondary bg-secondarySoft p-4">{rich(line.slice(2),'text-base font-semibold leading-6 text-ink',`qt-${nodes.length}`)}</View>,sourceLine);continue;}
    const bullet=line.match(/^[-*]\s+(.+)/);const ordered=line.match(/^\d+\.\s+(.+)/);if(bullet||ordered){flush();push(<View className="mb-2 flex-row pl-2"><Text className="mr-3 font-black text-primary">{ordered?`${ordered[0].split('.')[0]}.`:'•'}</Text>{rich((bullet??ordered)![1],'flex-1 text-base leading-6 text-ink',`lt-${nodes.length}`)}</View>,sourceLine);continue;}
    if(line.startsWith('*')&&line.endsWith('*')){flush();push(<Text className="mb-5 text-center text-sm italic leading-5 text-inkMuted">{clean(line)}</Text>,sourceLine);continue;}
    if(!paragraph.length)paragraphStart=sourceLine;
    paragraph.push(line);
  } flush(); return <View>{nodes}</View>;
}
