import React from 'react';
import '../styles.css';

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-logo">
          <img src="/Imagens/logo engenharia.png" alt="Normatel" />
        </div>

        <div className="footer-sep">|</div>

        <div className="footer-logo">
          <img src="/Imagens/Principal_h_cor_RGB.jpg" alt="Petrobras" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
