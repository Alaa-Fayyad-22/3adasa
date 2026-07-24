import { motion } from "framer-motion";
import { stats } from "../data/photos";

export default function Stats() {
  return (
    <section className="bg-bg py-16 md:py-24">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-6 sm:grid-cols-3 md:px-10 lg:px-16">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className={`flex flex-col items-center gap-2 text-center sm:items-start sm:text-left ${
              i > 0 ? "sm:border-l sm:border-stroke sm:pl-10" : ""
            }`}
          >
            <span className="font-display text-5xl italic text-text-primary md:text-6xl">
              {stat.value}
            </span>
            <span className="text-sm uppercase tracking-[0.2em] text-muted">
              {stat.label}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
