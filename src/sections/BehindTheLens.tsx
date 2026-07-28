import { motion } from "framer-motion";

type Step = {
  number: string;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    number: "01",
    title: "Inquiry & booking",
    description: "Reach out, pick a date, and the session details get confirmed.",
  },
  {
    number: "02",
    title: "Session day",
    description: "The shoot itself, wherever it's happening.",
  },
  {
    number: "03",
    title: "Editing",
    description: "Photos are selected and edited, usually within a few days.",
  },
  {
    number: "04",
    title: "Delivery",
    description: "Final photos sent straight over WhatsApp.",
  },
];

export default function BehindTheLens() {
  return (
    <section className="bg-bg py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-muted">
            Behind the Lens
          </span>
          <h2 className="font-display text-4xl text-text-primary md:text-5xl">
            How it <span className="italic">works</span>
          </h2>
          <p className="max-w-md text-sm text-muted md:text-base">
            From first message to final photos — here's what to expect.
          </p>
        </motion.div>

        <div className="relative mt-16 flex flex-col gap-10 md:mt-20 md:flex-row md:gap-8">
          {/* Connecting rail — vertical through the number column on mobile,
              horizontal through the number row on desktop. Animates in once
              per mount, independent of the per-step stagger below. */}
          <motion.span
            aria-hidden
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute left-[23px] top-1 bottom-1 w-px bg-stroke md:left-0 md:right-0 md:top-[27px] md:bottom-auto md:h-px md:w-auto"
          />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative flex gap-5 md:flex-1 md:flex-col md:gap-4"
            >
              <span className="w-12 shrink-0 text-center font-display text-3xl italic text-text-primary md:w-auto md:text-left md:text-4xl">
                {step.number}
              </span>
              <div className="pt-1 md:pt-0">
                <h3 className="mb-1.5 text-base font-semibold text-text-primary">
                  {step.title}
                </h3>
                <p className="max-w-[28ch] text-sm text-muted">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
