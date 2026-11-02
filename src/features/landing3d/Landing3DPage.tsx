import React, { useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import './landing3d.css';
import { SiteNav } from '../../components/SiteNav';
import { BUILT_TODAY, CONTACT_EMAIL, NOT_IN_THIS_RELEASE } from './content';
import { OpenDialog } from './OpenDialog';
import { Scene3D } from './Scene3D';

const NAV = [
  { label: 'The map', chapter: 1 },
  { label: 'The garage', chapter: 2 },
  { label: 'Trust', chapter: 3 },
  { label: 'Start', chapter: 4 },
];

export const Landing3DPage: React.FC = () => {
  const ctaHover = useRef(false);

  const setCtaHover = useCallback((hovering: boolean) => {
    ctaHover.current = hovering;
  }, []);

  const goTo = (chapter: number) => {
    const el = document.querySelector<HTMLElement>(`[data-chapter="${chapter}"]`);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 2, behavior: 'smooth' });
  };

  return (
    <div className="l3">
      <Scene3D ctaHoverRef={ctaHover} />

      <SiteNav
        variant="floating"
        sections={NAV.map((item) => ({ label: item.label, onClick: () => goTo(item.chapter) }))}
        primaryAction={{ label: 'Open the app', to: '/find' }}
      />

      <main>
        <section className="l3-chapter" data-chapter="0" style={{ height: '300vh' }}>
          <div className="l3-sticky">
            <div className="l3-beat l3-left" data-beat data-in="0" data-out="0.36">
              <h1 className="fym-display">
                Find a mechanic
                <br />
                you can trust.
              </h1>
              <p className="l3-lead">Garages near you on a map, with real opening hours, honest reviews and a phone number you can call directly.</p>
              <div className="l3-actions">
                <Link to="/find" className="l3-btn l3-btn-lg">
                  Find a garage near you
                </Link>
                <Link to="/roadside" className="l3-link">
                  Stranded? Get roadside help
                </Link>
                <Link to="/register?role=owner" className="l3-link">
                  I run a workshop
                </Link>
              </div>
            </div>
            <div className="l3-beat l3-left" data-beat data-in="0.46" data-out="1.1">
              <h2 className="fym-display">
                Drivers on one side.
                <br />
                Workshops on the other.
              </h2>
              <p className="l3-lead">A good fit holds. Scroll on and see how we put them together.</p>
            </div>
            <p className="l3-hint" data-beat data-in="0" data-out="0.14">
              Scroll to take it apart
            </p>
          </div>
        </section>

        <section className="l3-chapter" data-chapter="1" style={{ height: '260vh' }}>
          <div className="l3-sticky">
            <div className="l3-beat l3-left" data-beat data-in="0.02" data-out="0.56">
              <h2 className="fym-display">See who is near you.</h2>
              <p className="l3-lead">Garages appear on the map, closest first. Each pin is a hex nut, and its rating sits on top.</p>
            </div>
            <div className="l3-beat l3-left" data-beat data-in="0.6" data-out="1.1">
              <h3>Try it</h3>
              <p className="l3-lead">Hover a pin for the garage. Click one and the road to it is drawn.</p>
              <p className="l3-muted">Sample garages around Kathmandu.</p>
            </div>
          </div>
        </section>

        <section className="l3-chapter" data-chapter="2" style={{ height: '320vh' }}>
          <div className="l3-sticky">
            <div className="l3-beat l3-left" data-beat data-in="0" data-out="0.5">
              <h2 className="fym-display">
                Drive in.
                <br />
                We take it from here.
              </h2>
              <p className="l3-lead">Every garage has its own weekly schedule, so you know it is open before you leave.</p>
            </div>
            <div className="l3-beat l3-left" data-beat data-in="0.56" data-out="1.1">
              <h3>Open or closed, honestly</h3>
              <p className="l3-lead">Click the sign. Owners can close for now with a message, and drivers see it straight away.</p>
            </div>
          </div>
        </section>

        <section className="l3-chapter" data-chapter="3" style={{ height: '220vh' }}>
          <div className="l3-sticky">
            <div className="l3-beat l3-left" data-beat data-in="0" data-out="0.46">
              <h2 className="fym-display">Reviews you can read.</h2>
              <p className="l3-lead">One review per driver per garage, with the full breakdown, not just an average. Hover a bar.</p>
            </div>
            <div className="l3-beat l3-left" data-beat data-in="0.52" data-out="1.1">
              <h2 className="fym-display">
                Approved by
                <br />
                a person.
              </h2>
              <p className="l3-lead">A person checks every listing, point by point, before it goes public. Every decision is logged.</p>
            </div>
          </div>
        </section>

        <section className="l3-chapter l3-finale" data-chapter="4" style={{ height: '150vh' }}>
          <div className="l3-sticky l3-sticky-end">
            <div className="l3-beat l3-bottom" data-beat data-in="0.08" data-out="1.1">
              <h2 className="fym-display">
                Start with
                <br />
                one search.
              </h2>
              <p className="l3-lead">Pick your side. Hover the button and watch the pin land.</p>
            </div>
            <div className="l3-beat l3-right" data-beat data-in="0.12" data-out="1.1">
              <OpenDialog onHoverChange={setCtaHover} />
            </div>
          </div>
        </section>
      </main>

      <section className="l3-end" aria-label="For investors">
        <div className="l3-end-grid">
          <div>
            <h3>Built and working today</h3>
            <ul className="l3-hexlist">
              {BUILT_TODAY.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Deliberately not in this release</h3>
            <ul className="l3-hexlist l3-hexlist-quiet">
              {NOT_IN_THIS_RELEASE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="l3-end-note">Usage figures will appear here once there is real usage to report.</p>
            <p>
              Talk to us: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </div>
        </div>
        <footer className="l3-footer">
          <span>A garage directory for Kathmandu.</span>
          <nav aria-label="Footer">
            <Link to="/find">Find a garage</Link>
            <Link to="/register?role=owner">For workshops</Link>
            <Link to="/login">Log in</Link>
          </nav>
          <span className="l3-footer-end">
            <span>&copy; {new Date().getFullYear()} Find Your Mechanic</span>
          </span>
        </footer>
      </section>
    </div>
  );
};
