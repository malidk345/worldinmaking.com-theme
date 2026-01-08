import Dashboard from "./components/Dashboard";

export const metadata = {
  title: "Home",
  description: "Discover the latest insights, tutorials, and stories about technology, design, and life. Explore our curated collection of articles.",
  openGraph: {
    title: "World in Making - Home",
    description: "Discover the latest insights, tutorials, and stories about technology, design, and life.",
  },
};

export default function Home() {
  return (
    <Dashboard />
  );
}
