import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/b/markee/tracking")({
  component: TrackingPage,
});

function TrackingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-3xl font-bold">Acompanhar Chamado</h1>
        <p className="text-neutral-400">Insira o código do seu chamado para ver o status em tempo real.</p>
        <div className="space-y-4">
           <input 
             placeholder="Ex: MK-123456" 
             className="w-full bg-white/5 border border-white/10 rounded-full h-14 px-6 focus:outline-none focus:border-white/20 transition-all text-center text-lg tracking-widest"
           />
           <button className="w-full bg-white text-black h-14 rounded-full font-bold">
             Consultar Status
           </button>
        </div>
      </div>
    </div>
  );
}
