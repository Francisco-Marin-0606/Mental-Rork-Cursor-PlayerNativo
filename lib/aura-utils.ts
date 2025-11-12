import { BFFAuraHertzData } from './api-client';

export function replaceNameVariable(text: string | undefined, names?: string, wantToBeCalled?: string): string {
  if (!text) return '';
  const name = names || wantToBeCalled || '';
  return text.replace(/\$\{name\}/g, name);
}

export interface AuraTrack {
  id: string;
  title: string;
  subtitle?: string;
  trackUrl?: string;
}

export interface AuraAlbum {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  vinillo?: string;
  colorBackground?: string;
  colorText?: string;
  frecuencia?: string;
  tracks?: AuraTrack[];
}

export function getAlbumById(
  auraData: BFFAuraHertzData[],
  albumId: string,
  userGender: 'man' | 'woman'
): AuraAlbum | null {
  const instrumentalsData = auraData.find(item => item.instrumentals);
  if (!instrumentalsData?.instrumentals) return null;

  const albumArray = instrumentalsData.instrumentals[albumId as keyof typeof instrumentalsData.instrumentals];
  if (!Array.isArray(albumArray) || albumArray.length === 0) return null;

  const albumData = albumArray[0];
  const genderData = userGender === 'woman' ? 'woman' : 'man';

  const tracks: AuraTrack[] = (albumData.tracks || []).map((track, idx) => ({
    id: `${albumId}-track-${idx}`,
    title: track.title?.[genderData] || '',
    subtitle: albumData.description?.[genderData] || '',
    trackUrl: track.trackUrl?.[genderData],
  }));

  return {
    id: albumId,
    title: albumData.title?.[genderData] || '',
    description: albumData.description?.[genderData] || '',
    imageUrl: albumData.imageUrl?.[genderData],
    vinillo: albumData.vinillo?.[genderData],
    colorBackground: albumData.colorBackground?.[genderData],
    colorText: albumData.colorText?.[genderData],
    frecuencia: albumData.frecuencia?.[genderData],
    tracks,
  };
}
