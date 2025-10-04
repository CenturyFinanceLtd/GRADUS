import Slider from "react-slick";

const bankingPartners = [
  {
    name: "State Bank of India",
    href: "https://www.sbi.co.in/",
    image: "/assets/images/partners/Banking-Companies/state bank of india.png",
  },
  {
    name: "HDFC Bank",
    href: "https://www.hdfcbank.com/",
    image: "/assets/images/partners/Banking-Companies/HDFC-BANK.png",
  },
  {
    name: "ICICI Bank",
    href: "https://www.icicibank.com/",
    image: "/assets/images/partners/Banking-Companies/ICICI.png",
  },
  {
    name: "Kotak Mahindra Bank",
    href: "https://www.kotak.com/",
    image: "/assets/images/partners/Banking-Companies/Kotak.png",
  },
  {
    name: "Axis Bank",
    href: "https://www.axisbank.com/",
    image: "/assets/images/partners/Banking-Companies/AXIS.png",
  },
  {
    name: "Bank of Baroda",
    href: "https://www.bankofbaroda.in/",
    image: "/assets/images/partners/Banking-Companies/Bank-Of-Baroda.png",
  },
  {
    name: "Punjab National Bank",
    href: "https://www.pnbindia.in/",
    image: "/assets/images/partners/Banking-Companies/Punjab-Natunat-Bank.png",
  },
  {
    name: "IndusInd Bank",
    href: "https://www.indusind.com/",
    image: "/assets/images/partners/Banking-Companies/IndusInd Bank.png",
  },
  {
    name: "Bajaj Finance",
    href: "https://www.bajajfinance.in/",
    image: "/assets/images/partners/Banking-Companies/Bajaj Finance.png",
  },
  {
    name: "Bajaj Finserv",
    href: "https://www.bajajfinserv.in/",
    image: "/assets/images/partners/Banking-Companies/Bajaj Finserv.png",
  },
  {
    name: "LIC Housing Finance",
    href: "https://www.lichousing.com/",
    image: "/assets/images/partners/Banking-Companies/LIC Housing Finance.png",
  },
  {
    name: "Aditya Birla Capital",
    href: "https://www.adityabirlacapital.com/",
    image: "/assets/images/partners/Banking-Companies/Aditya Birla Capital.png",
  },
  {
    name: "Muthoot Finance",
    href: "https://www.muthootfinance.com/",
    image: "/assets/images/partners/Banking-Companies/Muthoot Finance.png",
  },
  {
    name: "Shriram Transport Finance",
    href: "https://www.shriramfinance.in/",
    image: "/assets/images/partners/Banking-Companies/Shriram Transport Finance.png",
  },
  {
    name: "Cholamandalam Investment & Finance",
    href: "https://www.cholamandalam.com/",
    image: "/assets/images/partners/Banking-Companies/Cholamandalam Investment & Finance.png",
  },
  {
    name: "Power Finance Corporation",
    href: "https://www.pfcindia.com/",
    image: "/assets/images/partners/Banking-Companies/Power Finance Corporation.png",
  },
  {
    name: "HDFC Life Insurance",
    href: "https://www.hdfclife.com/",
    image: "/assets/images/partners/Banking-Companies/HDFC Life Insurance.png",
  },
  {
    name: "SBI Life Insurance",
    href: "https://www.sbilife.co.in/",
    image: "/assets/images/partners/Banking-Companies/SBI Life Insurance.png",
  },
  {
    name: "HDFC AMC",
    href: "https://www.hdfcfund.com/",
    image: "/assets/images/partners/Banking-Companies/HDFC AMC.png",
  },
  {
    name: "Motilal Oswal Financial Services",
    href: "https://www.motilaloswal.com/",
    image: "/assets/images/partners/Banking-Companies/Motilal Oswal Financial Services.png",
  },
  {
    name: "BSE (Bombay Stock Exchange)",
    href: "https://www.bseindia.com/",
    image: "/assets/images/partners/Banking-Companies/BSE (Bombay Stock Exchange).png",
  },
  {
    name: "NSE (National Stock Exchange)",
    href: "https://www.nseindia.com/",
    image: "/assets/images/partners/Banking-Companies/NSE (National Stock Exchange).png",
  },
  {
    name: "IRFC (Indian Railway Finance Corporation)",
    href: "https://irfc.co.in/",
    image: "/assets/images/partners/Banking-Companies/IRFC.png",
  },
  {
    name: "PNB Housing Finance",
    href: "https://www.pnbhousing.com/",
    image: "/assets/images/partners/Banking-Companies/PNB Housing Finance.png",
  },
  {
    name: "L&T Finance Holdings",
    href: "https://www.ltfs.com/",
    image: "/assets/images/partners/Banking-Companies/L&T Finance Holdings.png",
  },
  {
    name: "Zerodha",
    href: "https://zerodha.com/",
    image: "/assets/images/partners/Banking-Companies/Zerodha.png",
  },
  {
    name: "Groww",
    href: "https://groww.in/",
    image: "/assets/images/partners/Banking-Companies/Groww.png",
  },
  {
    name: "Angel One",
    href: "https://www.angelone.in/",
    image: "/assets/images/partners/Banking-Companies/Angel One.png",
  },
  {
    name: "Upstox",
    href: "https://upstox.com/",
    image: "/assets/images/partners/Banking-Companies/Upstox.png",
  },
  {
    name: "HDFC Securities",
    href: "https://www.hdfcsec.com/",
    image: "/assets/images/partners/Banking-Companies/HDFC Securities.png",
  },
  {
    name: "ICICI Direct",
    href: "https://www.icicidirect.com/",
    image: "/assets/images/partners/Banking-Companies/ICICI Direct.png",
  },
  {
    name: "Kotak Securities",
    href: "https://www.kotaksecurities.com/",
    image: "/assets/images/partners/Banking-Companies/Kotak Securities.png",
  },
  {
    name: "SBI Securities",
    href: "https://www.sbisecurities.in/",
    image: "/assets/images/partners/Banking-Companies/SBI Securities.png",
  },
  {
    name: "Edelweiss Financial Services",
    href: "https://www.edelweissfin.com/",
    image: "/assets/images/partners/Banking-Companies/Edelweiss Financial Services.png",
  },
  {
    name: "IIFL Securities",
    href: "https://www.iiflsecurities.com/",
    image: "/assets/images/partners/Banking-Companies/IIFL Securities.png",
  },
  {
    name: "Axis Securities",
    href: "https://www.axisdirect.in/",
    image: "/assets/images/partners/Banking-Companies/Axis Securities.png",
  },
  {
    name: "JM Financial",
    href: "https://www.jmfl.com/",
    image: "/assets/images/partners/Banking-Companies/JM Financial.png",
  },
  {
    name: "Karvy",
    href: "https://www.karvy.com/",
    image: "/assets/images/partners/Banking-Companies/Karvy.png",
  },
  {
    name: "Sharekhan",
    href: "https://www.sharekhan.com/",
    image: "/assets/images/partners/Banking-Companies/Sharekhan.png",
  },
  {
    name: "Motilal Oswal",
    href: "https://www.motilaloswal.com/",
    image: "/assets/images/partners/Banking-Companies/Motilal Oswal.png",
  },
  {
    name: "5Paisa",
    href: "https://www.5paisa.com/",
    image: "/assets/images/partners/Banking-Companies/5Paisa.png",
  },
  {
    name: "Prabhudas Lilladher",
    href: "https://www.plindia.com/",
    image: "/assets/images/partners/Banking-Companies/Prabhudas Lilladher.png",
  },
  {
    name: "Sushil Finance",
    href: "https://www.sushilfinance.com/",
    image: "/assets/images/partners/Banking-Companies/Sushil Finance.png",
  },
  {
    name: "Centrum Capital",
    href: "https://www.centrum.co.in/",
    image: "/assets/images/partners/Banking-Companies/Centrum Capital.png",
  },
  {
    name: "Geojit Financial Services",
    href: "https://www.geojit.com/",
    image: "/assets/images/partners/Banking-Companies/Geojit Financial Services.png",
  },
  {
    name: "Nirmal Bang",
    href: "https://www.nirmalbang.com/",
    image: "/assets/images/partners/Banking-Companies/Nirmal Bang.png",
  },
  {
    name: "Ventura Securities",
    href: "https://www.venturasecurities.com/",
    image: "/assets/images/partners/Banking-Companies/Ventura Securities.png",
  },
  {
    name: "Reliance Securities",
    href: "https://www.reliancesmartmoney.com/",
    image: "/assets/images/partners/Banking-Companies/Reliance Securities.png",
  },
  {
    name: "DSP Mutual Fund",
    href: "https://www.dspim.com/",
    image: "/assets/images/partners/Banking-Companies/DSP Mutual Fund.png",
  },
];

const BrandTwo = () => {
  const settings = {
    slidesToShow: 7,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    speed: 900,
    dots: false,
    pauseOnHover: true,
    arrows: false,
    draggable: true,
    infinite: true,
    responsive: [
      {
        breakpoint: 1399,
        settings: {
          slidesToShow: 6,
          arrows: false,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 5,
          arrows: false,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          arrows: false,
        },
      },
      {
        breakpoint: 424,
        settings: {
          slidesToShow: 2,
          arrows: false,
        },
      },
      {
        breakpoint: 359,
        settings: {
          slidesToShow: 2,
          arrows: false,
        },
      },
    ],
  };
  return (
    <div
      className='brand wow fadeInUpBig'
      data-wow-duration='1s'
      data-wow-delay='.5s'
    >
      <div className='container container--lg'>
        <div className='brand-box py-80 px-16 '>
          <h5 className='mb-40 text-center text-neutral-500'>
           178+ Strategic Industry Partners
          </h5>
          <div className='container'>
            <Slider {...settings} className='brand-slider'>
              {bankingPartners.map(({ name, href, image }) => (
                <div className='brand-slider__item px-24' key={name}>
                  <a href={href} target='_blank' rel='noopener noreferrer'>
                    <img src={image} alt={name} />
                  </a>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandTwo;
