// Non-reactive store for captured embeddings.
//
// Embeddings are big Float32Arrays — we deliberately keep them OUT of the
// zustand store so React never tries to diff/serialize them. The UI only
// tracks lightweight counts + a few thumbnail data-URLs.

const embeddings = new Map<string, Float32Array[]>();

export function addEmbedding(classId: string, e: Float32Array): number {
  const arr = embeddings.get(classId) ?? [];
  arr.push(e);
  embeddings.set(classId, arr);
  return arr.length;
}

export function countFor(classId: string): number {
  return embeddings.get(classId)?.length ?? 0;
}

export function clearClass(classId: string): void {
  embeddings.set(classId, []);
}

export function dropClass(classId: string): void {
  embeddings.delete(classId);
}

export function clearAll(): void {
  embeddings.clear();
}

export interface FlatSample {
  classIndex: number;
  embedding: Float32Array;
}

/** Flatten samples for training, in the given class order. */
export function flatten(classIdsInOrder: string[]): FlatSample[] {
  const out: FlatSample[] = [];
  classIdsInOrder.forEach((id, classIndex) => {
    const arr = embeddings.get(id) ?? [];
    for (const embedding of arr) out.push({ classIndex, embedding });
  });
  return out;
}
