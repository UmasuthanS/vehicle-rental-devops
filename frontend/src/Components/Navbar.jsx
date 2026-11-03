function Navbar() {
  return (
    <nav className="flex items-center justify-between bg-gray-900 px-8 py-4 text-white">
      <h2 className="text-xl font-bold">Vehicle Rental</h2>
      <ul className="flex gap-6">
        <li><a href="#" className="hover:text-cyan-400">Home</a></li>
        <li><a href="#" className="hover:text-cyan-400">Vehicles</a></li>
        <li><a href="#" className="hover:text-cyan-400">Contact</a></li>
        <li><a href="#" className="hover:text-cyan-400">Login</a></li>
      </ul>
    </nav>
  );
}

export default Navbar;