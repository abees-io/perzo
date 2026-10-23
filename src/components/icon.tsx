type IconName = "screen" | "attachment" | "settings" | "image" | "camera" | "menu" | "new-chat" | "send" | "close" | "chat" | "spark" | "arrow" | "info" | "folder" | "plus" | "mic" | "stop" | "search" | "chevron";
const paths: Record<IconName, React.ReactNode> = {
  screen: <><rect x="2" y="3" width="20" height="14" rx="3" /><path d="M8 21h8m-4-4v4m0-14v6m-3-3 3-3 3 3" /></>,
attachment: <path d="m9 14 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9" />,
settings: <><path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11" /><circle cx="10" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="8" cy="18" r="2" /></>,
image: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
camera: <><path d="M8 5 9 3h6l1 2h3a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2Z" /><circle cx="12" cy="12" r="4" /></>,
  search: <><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  mic: <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6" /></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  folder: <><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><path d="M12 10v7m-3.5-3.5h7" /></>,
  menu: <path d="M5 7h14M5 12h14M5 17h9" />,
  "new-chat": <><path d="M13.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.5" /><path d="m12 12 1-4L19 2l3 3-6 6-4 1Z" /></>,
  send: <><path d="m21 3-6.5 18-4-7.5L3 9.5 21 3Z" /><path d="m10.5 13.5 5-5" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chat: <path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2V12a9 9 0 0 1 18-.5Z" />,
  spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
