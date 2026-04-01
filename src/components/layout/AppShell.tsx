import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-nubo-background">
      <TopBar title={title} />

      {/* Conteúdo com padding para não ficar embaixo do BottomNav */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
