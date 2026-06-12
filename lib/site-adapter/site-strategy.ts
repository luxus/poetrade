/**
 * Interface for PoE trade site version-specific strategies.
 * This enables clean pluggable implementations without hacks scattered.
 * PoE1 can use (encapsulated) poking for magic UX.
 * PoE2 can use cleaner DOM/event methods.
 */
export interface ISiteStrategy {
  getModSelectors(): string;
  getStatHashForKey(key: string): string | undefined;
  hasSiteApp(): boolean;
  getRowId(mod: HTMLElement): string;
  prepareModForButtons(mod: HTMLElement): void;
  decorateModForFiner(mod: HTMLElement): void;
  prepareAndDecorateModForFinerButtons(mod: HTMLElement): void;
  attachFilterButtons(mod: HTMLElement, buttonsElement: HTMLElement): void;
  scanVisibleMods(root?: ParentNode): void;
  addStatFilter(hash: string, mode?: 'include' | 'exclude', rowId?: string): Promise<boolean>;
  removeStatFilter(hash: string): Promise<boolean>;
  applyGlobalPresetAction(types: string[], prefix: string, isAdd: boolean): Promise<void>;
  isMagicSupported(): boolean;
  getCurrentFilterGroups(_type?: string): unknown[];
}