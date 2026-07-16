import { Image, Text, View } from 'react-native';
import { COURSE_IMAGES } from '@/src/services/course-images';

const ratios: Record<string, number> = { 'intersection.svg':1.52, 'route-automobile-autoroute.svg':2.13, 'route-chaussees-voies.svg':2.23, 'familles-panneaux.svg':2.67, 'balises.svg':2.72, 'vehicules-prioritaires.svg':2.56, 'categories-permis.svg':2.19 };
const clean = (text:string) => text.replace(/\*\*/g,'').replace(/`/g,'').trim();

export function CourseContent({ markdown }: { markdown: string }) {
  const lines=markdown.split('\n'); const nodes=[]; let paragraph:string[]=[];
  const flush=()=>{if(paragraph.length){const text=clean(paragraph.join(' '));nodes.push(<Text key={`p-${nodes.length}`} className="mb-4 text-base leading-7 text-ink">{text}</Text>);paragraph=[];}};
  for(const raw of lines){const line=raw.trim(); if(!line){flush();continue;}
    const image=line.match(/^!\[[^\]]*\]\(([^)]+)\)/); if(image){flush();const name=image[1].split('/').pop()!;const source=COURSE_IMAGES[name];if(source)nodes.push(<View key={`i-${nodes.length}`} className="mb-5 overflow-hidden rounded-3xl border border-border bg-white p-2"><Image source={source} style={{width:'100%',aspectRatio:ratios[name]??2}} resizeMode="contain"/></View>);continue;}
    if(line.startsWith('### ')){flush();nodes.push(<Text key={`h3-${nodes.length}`} className="mb-3 mt-5 text-xl font-black text-ink">{clean(line.slice(4))}</Text>);continue;}
    if(line.startsWith('## ')){flush();nodes.push(<Text key={`h2-${nodes.length}`} className="mb-4 mt-7 text-2xl font-black text-primary">{clean(line.slice(3))}</Text>);continue;}
    if(line.startsWith('# ')){flush();continue;}
    if(line.startsWith('> ')){flush();nodes.push(<View key={`q-${nodes.length}`} className="mb-5 rounded-2xl border-l-4 border-secondary bg-secondarySoft p-4"><Text className="text-base font-semibold leading-6 text-ink">{clean(line.slice(2))}</Text></View>);continue;}
    const bullet=line.match(/^[-*]\s+(.+)/);const ordered=line.match(/^\d+\.\s+(.+)/);if(bullet||ordered){flush();nodes.push(<View key={`l-${nodes.length}`} className="mb-2 flex-row pl-2"><Text className="mr-3 font-black text-primary">{ordered?`${ordered[0].split('.')[0]}.`:'•'}</Text><Text className="flex-1 text-base leading-6 text-ink">{clean((bullet??ordered)![1])}</Text></View>);continue;}
    if(line.startsWith('*')&&line.endsWith('*')){flush();nodes.push(<Text key={`c-${nodes.length}`} className="mb-5 text-center text-sm italic leading-5 text-inkMuted">{clean(line)}</Text>);continue;}
    paragraph.push(line);
  } flush(); return <View>{nodes}</View>;
}
