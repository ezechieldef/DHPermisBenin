import { FlatList, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { AppText as Text } from '@/src/components/app-text';
import { Card, Heading, Screen } from '@/src/components/ui';
import { QUESTION_IMAGE_CREDITS } from '@/src/services/question-image-credits';

export default function IllustrationCreditsScreen() {
  return <Screen scroll={false}>
    <FlatList
      data={QUESTION_IMAGE_CREDITS}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={<Heading title="Crédits des illustrations" subtitle="Les panneaux proviennent de Wikimedia Commons et de la collection SIG974. Leurs auteurs, sources et licences sont indiqués ci-dessous." />}
      ItemSeparatorComponent={() => <View className="h-4" />}
      renderItem={({ item }) => <Card>
        <Text className="text-base font-black text-ink">{item.title}</Text>
        <Text className="mt-2 text-sm leading-5 text-ink">{item.authors}</Text>
        <Text className="mt-2 text-xs leading-5 text-inkMuted">Illustrations : {item.files.join(', ')}</Text>
        {item.adaptedFiles.length ? <Text className="mt-2 text-xs leading-5 text-inkMuted">Adaptations par D-HARVEST (assemblage, inscription, miroir ou recadrage) : {item.adaptedFiles.join(', ')}</Text> : null}
        <Link href={item.sourceUrl as Href} className="mt-3 text-sm font-bold text-primary">Consulter la source</Link>
        <Link href={item.licenseUrl as Href} className="mt-3 text-sm font-bold text-primary">Licence {item.license}</Link>
      </Card>}
    />
  </Screen>;
}
