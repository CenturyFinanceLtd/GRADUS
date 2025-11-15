import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";

const COUNTER_DATA = [
  {
    id: "trained",
    label: "Successfully Trained",
    value: 10,
    suffix: "K+",
    icon: "ph-graduation-cap",
    accent: "#5B6CFF",
  },
  {
    id: "students",
    label: "Students till date",
    value: 15,
    suffix: "K+",
    icon: "ph-users-three",
    accent: "#F57C00",
  },
  {
    id: "rating",
    label: "Overall Rating",
    value: 5,
    suffix: "",
    icon: "ph-thumbs-up",
    accent: "#4C6FFF",
  },
  {
    id: "community",
    label: "Student Community",
    value: 135,
    suffix: "K",
    icon: "ph-circles-three-plus",
    accent: "#FF7D66",
  },
];

const CounterTwo = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  return (
    <section className='counter-highlight py-64'>
      <div className='container'>
        <div className='counter-highlight__grid' ref={ref}>
          {COUNTER_DATA.map(({ id, label, value, suffix, icon, accent }, index) => (
            <article
              className='counter-highlight__item'
              key={id}
              data-aos='fade-up'
              data-aos-duration={200 + index * 150}
            >
              <span className='counter-highlight__icon' style={{ color: accent }}>
                <i className={`ph ${icon}`} />
              </span>
              <div className='counter-highlight__value'>
                {inView ? <CountUp end={value} duration={1.5} /> : 0}
                {suffix}
              </div>
              <p className='counter-highlight__label'>{label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CounterTwo;
