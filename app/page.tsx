import Nav from "@/components/Nav";
import Hero from "@/components/hero/Hero";
import Stats from "@/components/sections/Stats";
import Systems from "@/components/systems/Systems";
import Fabrication from "@/components/sections/Fabrication";
import ProjectMap from "@/components/map/ProjectMap";
import Work from "@/components/sections/Work";
import Credentials from "@/components/sections/Credentials";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";
import Reveal from "@/components/Reveal";

/**
 * Company profile for All Air Mechanical Contractors.
 * The motion language comes from the logo itself: three airflow streams —
 * blue, green, red — passing through a ring. They reappear throughout the page
 * as the air in the ducts, the lines on the map, and the rhythm of the reveals.
 */
export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Systems />
        <Fabrication />
        <ProjectMap />
        <Work />
        <Credentials />
        <Contact />
      </main>
      <Footer />
      <Reveal />
    </>
  );
}
