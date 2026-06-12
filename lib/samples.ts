// Non-reactive store for captured embeddings.
//
// Embeddings are big Float32Arrays — we deliberately keep them OUT of the
// zustand store so React never tries to diff/serialize them. The UI only
// tracks lightweight counts + thumbnail data-URLs keyed by sample id, so a
// single example can be deleted from both stores consistently.

export interface StoredSample {
  id: string;
  embedding: Float32Array;
}

const samplesByClass = new Map<string, StoredSample[]>();
let seq = 0;

export function addEmbedding(
  classId: string,
  embedding: Float32Array,
): { sampleId: string; count: number } {
  const arr = samplesByClass.get(classId) ?? [];
  const sampleId = `s_${++seq}`;
  arr.push({ id: sampleId, embedding });
  samplesByClass.set(classId, arr);
  return { sampleId, count: arr.length };
}

/** Delete one example by id. Returns the new count. */
export function removeSample(classId: string, sampleId: string): number {
  const arr = samplesByClass.get(classId) ?? [];
  const next = arr.filter((s) => s.id !== sampleId);
  samplesByClass.set(classId, next);
  return next.length;
}

export function countFor(classId: string): number {
  return samplesByClass.get(classId)?.length ?? 0;
}

export function clearClass(classId: string): void {
  samplesByClass.set(classId, []);
}

export function dropClass(classId: string): void {
  samplesByClass.delete(classId);
}

export function clearAll(): void {
  samplesByClass.clear();
}

export interface FlatSample {
  classIndex: number;
  embedding: Float32Array;
}

/** Flatten samples for training, in the given class order. */
export function flatten(classIdsInOrder: string[]): FlatSample[] {
  const out: FlatSample[] = [];
  classIdsInOrder.forEach((id, classIndex) => {
    const arr = samplesByClass.get(id) ?? [];
    for (const { embedding } of arr) out.push({ classIndex, embedding });
  });
  return out;
}
