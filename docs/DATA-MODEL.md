# Data Model
type Id = string;
type HistoryItem = { text: string; at: string };
type DebateBlock = { id: Id; parentId: Id | null; depth: number; order: number; text: string; history: HistoryItem[] };
type Debate = { _id: Id; resolved: boolean; blocks: DebateBlock[]; updatedAt: string };
Notes: order reindexed on delete; history appends previous text on edit; drafts client-only.
