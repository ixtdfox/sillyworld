export type ScreenLifecycleHook = () => void;

/**
 * Explicit contract used by screen renderers that attach lifecycle behavior
 * directly to their root DOM node.
 */
export interface ScreenNodeLifecycle {
  __sillyOnMount?: ScreenLifecycleHook;
  __sillyOnUnmount?: ScreenLifecycleHook;
}

export type ScreenNode = HTMLElement & ScreenNodeLifecycle;

export type ScreenRenderer<TOptions = void> = [TOptions] extends [void]
  ? () => ScreenNode
  : (options: TOptions) => ScreenNode;

export function asScreenNode(node: HTMLElement): ScreenNode {
  return node as ScreenNode;
}

export function hasScreenMount(node: ScreenNode): node is ScreenNode & Required<Pick<ScreenNodeLifecycle, '__sillyOnMount'>> {
  return typeof node.__sillyOnMount === 'function';
}

export function hasScreenUnmount(node: ScreenNode): node is ScreenNode & Required<Pick<ScreenNodeLifecycle, '__sillyOnUnmount'>> {
  return typeof node.__sillyOnUnmount === 'function';
}
