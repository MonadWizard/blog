export type Marker = 'strength' | 'mock' | 'gate';

export interface Step {
  levelPath: string;
  levelTitle: string;
  title: string;
  description: string;
  markers?: Marker[];
}

export interface TreeNode {
  step: Step;
  children: TreeNode[];
  levelPath: string;
}

// First dot-segment of levelPath encodes depth: 0=root, 1=phase, 2=module, 3=leaf item, etc.
export function stepDepth(levelPath: string): number {
  return parseInt(levelPath.split('.')[0], 10);
}

export function buildTree(steps: Step[]): TreeNode | null {
  if (!steps.length) return null;

  const nodeMap = new Map<string, TreeNode>();
  for (const step of steps) {
    nodeMap.set(step.levelPath, { step, children: [], levelPath: step.levelPath });
  }

  let root: TreeNode | null = null;
  for (const node of nodeMap.values()) {
    const parts = node.levelPath.split('.');
    const depth = parseInt(parts[0], 10);
    if (depth === 0) {
      root = node;
    } else {
      const parentDepth = depth - 1;
      const parentPath =
        parentDepth === 0 ? '0' : `${parentDepth}.${parts.slice(1, -1).join('.')}`;
      nodeMap.get(parentPath)?.children.push(node);
    }
  }

  function sortChildren(node: TreeNode) {
    node.children.sort((a, b) => {
      const ia = parseInt(a.levelPath.split('.').at(-1)!, 10);
      const ib = parseInt(b.levelPath.split('.').at(-1)!, 10);
      return ia - ib;
    });
    node.children.forEach(sortChildren);
  }
  if (root) sortChildren(root);
  return root;
}

// Compact badge palette for the outline's number-hint badges (distinct from
// JourneyTreeNode's own 5-color card palette, which stays local to that file).
export const DEPTH_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#9ca3af'] as const;
export function depthColor(depth: number): string {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
}
