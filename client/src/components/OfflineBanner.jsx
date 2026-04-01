export default function OfflineBanner({ isOnline }) {
  return (
    <div
      className={`fixed top-0 left-0 w-full z-[200] bg-orange-500 text-white text-sm font-medium text-center py-2 px-4
        transition-transform duration-300 ease-in-out
        ${isOnline ? '-translate-y-full' : 'translate-y-0'}`}
    >
      You are offline — changes will sync when reconnected
    </div>
  )
}
