import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaChartLine, FaPlay, FaWallet } from 'react-icons/fa';
import heroImage from '../../assets/hero.png';

const steps = [
  { number: '01', title: 'Find a video', text: 'Browse shared videos by category or search for something you want to watch.', icon: FaPlay },
  { number: '02', title: 'Watch naturally', text: 'Your verified watch time is recorded as you enjoy the content.', icon: FaChartLine },
  { number: '03', title: 'Build your balance', text: 'Rewards accumulate from watch time and appear in your wallet.', icon: FaWallet },
];

const Home = () => (
  <div className="overflow-hidden bg-dark-50 text-dark-900">
    <main>
      <section className="relative border-b border-dark-200 bg-dark-900 text-white">
        <div className="container-custom grid min-h-0 items-center gap-8 py-12 sm:gap-12 sm:py-16 lg:min-h-[620px] lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-primary-300">Watch. Earn. Repeat.</p>
            <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">Your screen time can move you forward.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-dark-300 sm:mt-6 sm:text-lg sm:leading-8">Videa connects curious viewers with creators. Watch great videos, earn from verified watch time, and keep every reward visible in your wallet.</p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link to="/register" className="btn-primary inline-flex justify-center items-center gap-3 px-6 py-3">Start watching <FaArrowRight className="text-xs" /></Link>
              <Link to="/login" className="inline-flex justify-center items-center border border-dark-600 px-6 py-3 text-sm font-semibold text-white transition hover:border-primary-300 hover:text-primary-200">Sign in</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-dark-400">
              <span><strong className="text-white">45 sec</strong> to count a view</span>
              <span><strong className="text-white">Live</strong> wallet updates</span>
            </div>
          </div>
          <div className="relative flex min-h-[270px] items-center justify-center sm:min-h-[340px] lg:min-h-[480px]">
            <div className="absolute h-56 w-56 border border-primary-400/30 bg-primary-600/10 sm:h-96 sm:w-96" />
            <img src={heroImage} alt="Layered Videa platform mark" className="relative z-10 w-52 drop-shadow-[0_24px_40px_rgba(124,58,237,0.3)] sm:w-80" />
            <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 border border-dark-600 bg-dark-800 px-4 py-3 shadow-2xl sm:bottom-8 sm:left-12 sm:translate-x-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dark-400">Current reward</p>
              <p className="mt-1 text-xl font-bold text-white">RWF 1.00 <span className="text-xs font-normal text-primary-300">/ min</span></p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-dark-200 bg-white py-14 sm:py-20">
        <div className="container-custom">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-600">A simple loop</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-dark-900 sm:text-4xl">More attention. More momentum.</h2>
          </div>
          <div className="mt-12 grid gap-px border border-dark-200 bg-dark-200 md:grid-cols-3">
            {steps.map(({ number, title, text, icon: Icon }) => (
              <article key={number} className="bg-white p-7">
                <div className="flex items-center justify-between text-primary-600"><span className="font-mono text-xs">{number}</span><Icon /></div>
                <h3 className="mt-8 text-xl font-bold text-dark-900 sm:mt-12">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-dark-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary-700 py-16 text-white">
        <div className="container-custom flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary-200">For creators</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Put your videos in front of viewers who stay.</h2>
            <p className="mt-3 max-w-xl leading-7 text-primary-100">Share your channel, grow an engaged audience, and earn a transparent share when people watch.</p>
          </div>
          <Link to="/register" className="inline-flex shrink-0 items-center gap-3 bg-white px-6 py-3 text-sm font-bold text-primary-700 transition hover:bg-primary-50">Create an account <FaArrowRight className="text-xs" /></Link>
        </div>
      </section>
    </main>
    <footer className="border-t border-dark-200 bg-dark-950 py-6 text-sm text-dark-400">
      <div className="container-custom flex flex-col justify-between gap-2 sm:flex-row"><span className="font-semibold text-white">Videa</span><span>Watch with purpose.</span></div>
    </footer>
  </div>
);

export default Home;