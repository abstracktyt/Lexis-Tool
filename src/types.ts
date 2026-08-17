export interface QuickReply {
  text: string;
}

export interface QuickCategory {
  title: string;
  replies: QuickReply[];
}

export interface Punishment {
  type: string;
  duration?: string;
  unit?: 'мин' | 'дн';
}

export interface BindAction {
  type: 'key' | 'text' | 'chat' | 'delay';
  value: string | number;
}

export interface Bind {
  name: string;
  hotkey: string;
  actions: BindAction[];
}

export interface Rule {
  id: string;
  name: string;
  content: string;
  punishmentType: string;
  duration: string;
  durationUnit?: 'мин' | 'дн';
  punishments?: Punishment[];
  severity: number;
  isPinned?: boolean;
  isDivider?: boolean;
  /** Hides the rules after this chapter until the next chapter divider. */
  isCollapsed?: boolean;
}

export interface RuleCategory {
  id: string;
  name: string;
  rules: Rule[];
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  author?: string;
  ruleCount?: number;
  binds?: Bind[];
  quickReplies?: QuickCategory[];
}

export interface Settings {
  overlayHotkey: string;
  autoEnter: boolean;
  chatKey: string;
  sendKey: string;
  overlayOpacity: number;
  overlayScale: number;
  memoEnabled: boolean;
  memoText: string;
  accentColor: string;
  backgroundColor?: string;
  textColor?: string;
  textMutedColor?: string;
  buttonColor?: string;
  heroGradientColor1?: string;
  heroGradientColor2?: string;
  eventsHotkey?: string;
  onlineHotkey?: string;
  binder_chat_key?: string;
  binder_delay?: number;
  binder_target_process?: string;
  binder_process?: string;
  binder_check_focus?: boolean;
  binder_x?: number;
  binder_y?: number;
  binder_scale?: number;
  binder_enabled?: boolean;
}
