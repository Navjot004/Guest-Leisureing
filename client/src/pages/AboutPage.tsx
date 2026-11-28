import React from 'react';
import { useNavigate } from 'react-router-dom';
import facultyTransitImage from '../assets/faculty-transit.svg';
import hostelGuestImage from '../assets/hostel-guest.svg';
import dormitoryImage from '../assets/dormitory.svg';
import hostelMessImage from '../assets/hostel-mess.svg';
import campusShuttleImage from '../assets/faculty-transit.png';
import academicConferenceImage from '../assets/academic-conference.svg';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const goToApplication = () => navigate('/#visitor-application');

  return (
    <div className="ctu-public-page ctu-about-page">
      <main className="ctu-public-main">
        <header className="ctu-about-intro">
          <span>CT University • Visitor Services</span>
          <h1>Campus hospitality, thoughtfully arranged.</h1>
          <p>
            Learn about visitor accommodation, dining, transportation and campus services
            available to visiting academics, families and university guests.
          </p>
          <button type="button" className="ctu-primary-action" onClick={goToApplication}>
            Back to application form <span aria-hidden="true">→</span>
          </button>
        </header>

        <section className="ctu-stay-gallery" aria-labelledby="ctu-accommodation-heading">
          <header className="ctu-editorial-heading">
            <div>
              <span>01 / Campus Accommodation</span>
              <h2 id="ctu-accommodation-heading">Rest, work and arrive ready.</h2>
            </div>
            <p>Purposeful spaces for visiting examiners, guest faculty, parents and academic delegates.</p>
          </header>
          <div className="ctu-stay-mosaic">
            <article className="ctu-feature-stay">
              <img src={facultyTransitImage} alt="Faculty Transit Quarters room" />
              <div className="ctu-image-caption">
                <span>Featured stay</span>
                <h3>Faculty Transit Quarters</h3>
                <p>Study desk, Wi-Fi and a quiet attached-bathroom room.</p>
              </div>
            </article>
            <article className="ctu-support-stay">
              <img src={hostelGuestImage} alt="Hostel guest wing room" />
              <div>
                <span>Hostel Guest Wing</span>
                <h3>Twin-room comfort</h3>
              </div>
            </article>
            <article className="ctu-support-stay ctu-support-stay-tall">
              <img src={dormitoryImage} alt="Common dormitory accommodation" />
              <div>
                <span>Group accommodation</span>
                <h3>Common Dormitory</h3>
              </div>
            </article>
          </div>
        </section>

        <section className="ctu-dining-editorial">
          <div className="ctu-dining-image">
            <img src={hostelMessImage} alt="Vegetarian hostel mess dining experience" />
          </div>
          <div className="ctu-dining-copy">
            <span>02 / Campus Dining</span>
            <h2>Food that feels at home.</h2>
            <p>Vegetarian hostel mess dining with breakfast, lunch and dinner meal passes coordinated by the campus mess desk.</p>
            <button type="button" className="ctu-editorial-link" onClick={goToApplication}>
              Add mess meals <span>→</span>
            </button>
          </div>
        </section>

        <section className="ctu-shuttle-editorial">
          <img src={campusShuttleImage} alt="Campus gate shuttle" />
          <aside>
            <span>03 / Campus Transportation</span>
            <h2>From gate to department.</h2>
            <p>Coordinate an arrival shuttle or campus gate pickup with the transport desk.</p>
            <button type="button" className="ctu-editorial-link" onClick={goToApplication}>
              Request a shuttle <span>→</span>
            </button>
          </aside>
        </section>

        <section className="ctu-visitors-editorial">
          <div className="ctu-visitors-copy">
            <span>04 / Academic Visitors</span>
            <h2>For the people shaping the university.</h2>
            <p>Clearance and campus services for external examiners, visiting faculty, conference delegates and academic guests.</p>
          </div>
          <img src={academicConferenceImage} alt="Academic conference and visiting scholars" />
        </section>

        <section className="ctu-facilities-editorial">
          <header>
            <div>
              <span>05 / Campus Facilities</span>
              <h2>Everything for a considered visit.</h2>
            </div>
            <button type="button" className="ctu-editorial-link" onClick={goToApplication}>
              Apply for campus services <span>→</span>
            </button>
          </header>
          <div>
            <article><small>01</small><h3>Transit lodging</h3><p>Faculty rooms and hostel guest wings.</p></article>
            <article><small>02</small><h3>Hostel dining</h3><p>Breakfast, lunch and dinner passes.</p></article>
            <article><small>03</small><h3>Gate shuttle</h3><p>Pickup and department transport.</p></article>
            <article><small>04</small><h3>Visitor clearance</h3><p>Digital entry reference and tracking.</p></article>
          </div>
        </section>

        <section id="visitor-guidelines" className="uni-card ctu-about-guidelines">
          <div className="uni-card-header">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
              CT University • Campus Visitor & Hostel Guidelines
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
              Please review the institutional transit lodging, mess schedule, and security check-in protocols.
            </p>
          </div>

          <div className="uni-card-body">
            <div className="responsive-form-grid" style={{ marginBottom: '1.5rem' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🪪</span>
                  <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>Gate Check-In & Photo ID</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                  All external visitors must carry a valid Government-issued Photo ID (Aadhaar / Voter ID / Passport / Institutional Faculty ID) and present their Reference Code at the Main Security Gate.
                </p>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🚪</span>
                  <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>Gate Curfew & Check-In Timings</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                  Standard Check-in is from 12:00 PM onwards, and Check-out is by 11:00 AM. In accordance with university campus security, main hostel gates close at 10:00 PM strictly. Late arrivals must inform the Caretaker Desk in advance.
                </p>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🍽️</span>
                  <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>Hostel Mess Meal Timings</strong>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: '1.6' }}>
                  <div>• <strong>Breakfast:</strong> 07:30 AM – 09:15 AM</div>
                  <div>• <strong>Lunch:</strong> 12:15 PM – 02:00 PM</div>
                  <div>• <strong>Dinner:</strong> 07:30 PM – 09:15 PM</div>
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#64748B' }}>
                    Standard pure vegetarian thali served. For special dietary needs, kindly inform the mess supervisor.
                  </div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🚭</span>
                  <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>Campus Decorum & Prohibitions</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                  CT University maintains a strict zero-tolerance policy against smoking, alcohol, and narcotic substances on campus premises. Please maintain academic decorum and respect hostel quiet hours after 10:00 PM.
                </p>
              </div>
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1E3A8A', fontSize: '0.9rem' }}>
                  Hostel Warden & Caretaker Allotment Helpdesk
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#1E40AF', marginTop: '2px' }}>
                  For urgent room verification or night transit inquiries, contact the Facility Control Room.
                </div>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E3A8A' }}>
                📞 +91 161 520 2222 / 520 2200
              </div>
            </div>
          </div>
        </section>

        <footer className="ctu-footer">
          <div>
            <strong>CT University</strong>
            <span>Campus Lodging & Hostel Mess Portal</span>
          </div>
          <div>
            <span>Ferozepur Road, Ludhiana, Punjab</span>
            <span>Department of Computer Science & Engineering</span>
          </div>
        </footer>
      </main>
    </div>
  );
};
