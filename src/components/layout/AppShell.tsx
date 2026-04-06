import TopBar from "@/components/navigation/TopBar";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-nubo-background">
      <TopBar title={title} />

      <main className="flex-1 flex flex-col">
        {/* Glass content wrapper — max-w-7xl constrains layout on Desktop */}
        <div
          className="flex-1 max-w-7xl w-full mx-auto backdrop-blur-md border border-white/20 rounded-t-3xl"
          style={{ background: "rgba(255,255,255,0.30)" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
