export default function Loading() {
  return (
    <div className="grid min-h-[70vh] place-items-center" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <span className="font-serif text-3xl italic text-gold">CL</span>
        <span className="h-px w-24 origin-left animate-pulse bg-gold" />
      </div>
    </div>
  );
}
