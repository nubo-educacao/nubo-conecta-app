import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <TopBar title={title} />

      <main className="flex-1 flex flex-col px-0 pb-16 md:px-6 md:py-8 relative">
        <div
          className="flex-1 max-w-[1200px] w-full mx-auto bg-transparent md:bg-white/30 md:backdrop-blur-md md:border md:border-white/20 rounded-none md:rounded-3xl md:shadow-2xl"
        >
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
