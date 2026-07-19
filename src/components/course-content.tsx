import { useEffect, useMemo, type ReactNode } from 'react';
import { useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import { AppText as Text } from '@/src/components/app-text';
import { Galeria } from '@nandorojo/galeria';
import { Image } from 'expo-image';
import { COURSE_IMAGES, getCourseImageSize, getCourseImageUri } from '@/src/services/course-images';
import type { Definition } from '@/src/types/models';
import { useThemePreferences } from '@/src/theme/preferences';

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

function splitAtWord(text:string,target:number) {
  if(text.length<=target)return [text,''] as const;
  const before=text.lastIndexOf(' ',target);
  const after=text.indexOf(' ',target);
  const index=before>target*0.72?before:after;
  return index<0?[text,''] as const:[text.slice(0,index).trim(),text.slice(index).trim()] as const;
}

function useGaleriaWebClickGuard() {
  useEffect(()=>{
    if(process.env.EXPO_OS!=='web')return;
    let scale=1;
    const applyZoom=(image:HTMLImageElement,next:number)=>{
      scale=Math.max(1,Math.min(5,next));
      image.style.transform=`scale(${scale})`;
      image.style.transition='transform 160ms ease-out';
      image.style.cursor=scale>1?'zoom-out':'zoom-in';
    };
    const keepOpen=(event:MouseEvent)=>{
      const target=event.target;
      if(target instanceof Element&&target.closest('[galeria-popup] img'))event.stopPropagation();
    };
    const doubleClick=(event:MouseEvent)=>{
      const target=event.target;
      const image=target instanceof Element?target.closest<HTMLImageElement>('[galeria-popup] img'):null;
      if(!image)return;
      event.preventDefault();event.stopPropagation();
      applyZoom(image,scale>1?1:2.5);
    };
    const wheel=(event:WheelEvent)=>{
      const target=event.target;
      const image=target instanceof Element?target.closest<HTMLImageElement>('[galeria-popup] img'):null;
      if(!image)return;
      event.preventDefault();event.stopPropagation();
      applyZoom(image,scale+(event.deltaY<0?0.35:-0.35));
    };
    document.addEventListener('click',keepOpen,true);
    document.addEventListener('dblclick',doubleClick,true);
    document.addEventListener('wheel',wheel,{capture:true,passive:false});
    return ()=>{
      document.removeEventListener('click',keepOpen,true);
      document.removeEventListener('dblclick',doubleClick,true);
      document.removeEventListener('wheel',wheel,true);
    };
  },[]);
}

export function CourseGalleryImage({source,title,width}: {source:ImageSourcePropType;title:string;width:number}) {
  const {scheme}=useThemePreferences();
  const size=getCourseImageSize(source);
  const height=width*size.height/size.width;
  const gallerySource=process.env.EXPO_OS==='web'?getCourseImageUri(source):source;
  return <View collapsable={false} style={{width,height,overflow:'hidden'}}>
    <Galeria urls={[gallerySource]} theme={scheme}>
      <Galeria.Image dynamicAspectRatio={process.env.EXPO_OS==='web'} style={{width,height}}>
        <Image accessibilityLabel={title||'Illustration du cours'} source={source} style={{width,height}} contentFit="contain" transition={120}/>
      </Galeria.Image>
    </Galeria>
  </View>;
}

function SideIllustration({ name, title, side, text, definitions, onDefinitionPress }:{name:string;title:string;side:'left'|'right';text:string;definitions:Definition[];onDefinitionPress?:(definition:Definition)=>void}) {
  if(process.env.EXPO_OS==='web')return <WebSideIllustration name={name} title={title} side={side} text={text} definitions={definitions} onDefinitionPress={onDefinitionPress}/>;
  return <NativeSideIllustration name={name} title={title} side={side} text={text} definitions={definitions} onDefinitionPress={onDefinitionPress}/>;
}

function NativeSideIllustration({ name, title, side, text, definitions, onDefinitionPress }:{name:string;title:string;side:'left'|'right';text:string;definitions:Definition[];onDefinitionPress?:(definition:Definition)=>void}) {
  const { width }=useWindowDimensions();
  const { textScale }=useThemePreferences();
  const contentWidth=Math.max(280,Math.min(width-40,760));
  const imageWidth=Math.max(108,Math.min(168,contentWidth*0.28));
  const source=COURSE_IMAGES[name];
  const size=getCourseImageSize(source);
  const imageHeight=imageWidth*size.height/size.width;
  const sideWidth=contentWidth-imageWidth-16;
  const lineHeight=28*textScale;
  const linesNextToImage=Math.max(2,Math.floor(imageHeight/lineHeight));
  const charactersPerLine=Math.max(18,Math.floor(sideWidth/(8.4*textScale)));
  const [beside,below]=splitAtWord(clean(text),linesNextToImage*charactersPerLine);
  const picture=<CourseGalleryImage source={source} title={title} width={imageWidth}/>;
  return <View className="mb-5">
    <View className={`flex-row items-start gap-4 ${side==='right'?'flex-row-reverse':''}`}>
      {picture}
      <RichText text={beside} definitions={definitions} onDefinitionPress={onDefinitionPress} className="flex-1 text-base leading-7 text-ink"/>
    </View>
    {below?<View className="mt-2"><RichText text={below} definitions={definitions} onDefinitionPress={onDefinitionPress} className="text-base leading-7 text-ink"/></View>:null}
  </View>;
}

function WebSideIllustration({ name, title, side, text, definitions, onDefinitionPress }:{name:string;title:string;side:'left'|'right';text:string;definitions:Definition[];onDefinitionPress?:(definition:Definition)=>void}) {
  const {width}=useWindowDimensions();
  const imageWidth=Math.max(90,Math.min(210,(width-40)*0.3));
  const floatStyle={float:side,width:imageWidth,marginRight:side==='left'?14:0,marginLeft:side==='right'?14:0,marginBottom:6} as never;
  return <View className="mb-5" style={{display:'flow-root'} as never}>
    <View style={floatStyle}><CourseGalleryImage source={COURSE_IMAGES[name]} title={title} width={imageWidth}/></View>
    <RichText text={text} definitions={definitions} onDefinitionPress={onDefinitionPress} className="text-base leading-7 text-ink"/>
  </View>;
}

export function CourseContent({ markdown, definitions=[], onDefinitionPress, activeRange, listening=false, onBlockLayout, lineOffset=0 }: { markdown: string;definitions?:Definition[];onDefinitionPress?:(definition:Definition)=>void;activeRange?:{startLine:number;endLine:number}|null;listening?:boolean;onBlockLayout?:(line:number,y:number)=>void;lineOffset?:number }) {
  useGaleriaWebClickGuard();
  const {width}=useWindowDimensions();
  const lines=markdown.split('\n'); const nodes:ReactNode[]=[]; let paragraph:string[]=[];
  let paragraphStart=1;
  const rich=(text:string,className:string,key:string)=><RichText key={key} text={text} definitions={definitions} onDefinitionPress={onDefinitionPress} className={className}/>;
  const push=(node:ReactNode,line:number)=>{const active=!listening||!activeRange||(line>=activeRange.startLine&&line<=activeRange.endLine);nodes.push(<View key={`block-${line}-${nodes.length}`} onLayout={(event)=>onBlockLayout?.(line,event.nativeEvent.layout.y)} style={{opacity:active?1:0.24}}>{node}</View>);};
  const imageButton=(name:string,title:string)=><CourseGalleryImage source={COURSE_IMAGES[name]} title={title} width={Math.max(280,Math.min(width-40,760))}/>;
  const flush=()=>{if(paragraph.length){push(rich(paragraph.join(' '),'mb-5 text-base leading-7 text-ink',`p-${nodes.length}`),paragraphStart);paragraph=[];}};
  for(let lineIndex=0;lineIndex<lines.length;lineIndex++){const raw=lines[lineIndex];const sourceLine=lineIndex+1+lineOffset;const line=raw.trim(); if(!line){flush();continue;}
    const sideImage=line.match(/^!\[([^\]]*)\]\(([^)]+)\)\{(left|right)\}$/); if(sideImage){flush();const name=sideImage[2].split('/').pop()!;const source=COURSE_IMAGES[name];let textIndex=lineIndex+1;while(textIndex<lines.length&&!lines[textIndex].trim())textIndex++;const sideText=lines[textIndex]?.trim();if(source&&sideText&&!/^(#|[-*]\s|\d+\.\s|!\[|>\s)/.test(sideText)){push(<SideIllustration name={name} title={sideImage[1]} side={sideImage[3] as 'left'|'right'} text={sideText} definitions={definitions} onDefinitionPress={onDefinitionPress}/>,sourceLine);lineIndex=textIndex;continue;}}
    const image=line.match(/^!\[([^\]]*)\]\(([^)]+)\)/); if(image){flush();const name=image[2].split('/').pop()!;const source=COURSE_IMAGES[name];if(source)push(<View className="mb-5">{imageButton(name,image[1])}</View>,sourceLine);continue;}
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
