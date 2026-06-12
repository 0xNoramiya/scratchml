// Non-reactive embedding store. Float32Arrays are kept out of zustand intentionally —
// React must never diff/serialize them; the UI syncs only counts + thumb URLs.

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

export function flatten(classIdsInOrder: string[]): FlatSample[] {
  const out: FlatSample[] = [];
  classIdsInOrder.forEach((id, classIndex) => {
    const arr = samplesByClass.get(id) ?? [];
    for (const { embedding } of arr) out.push({ classIndex, embedding });
  });
  return out;
}
