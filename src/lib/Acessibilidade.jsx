import { useEffect, useId, useRef, useState } from 'react';
import {
  Accessibility,
  Contrast,
  MousePointer2,
  Moon,
  Pause,
  RotateCcw,
  Sun,
  Type,
  Underline,
  X
} from 'lucide-react';
import { FONT_SCALES, resetA11y, setA11y, useA11y } from '@/lib/a11y';

const FONT_LABELS = ['A−', 'A', 'A+', 'A++', 'A+++'];

export default function Acessibilidade() {
  const settings = useA11y();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const lastActiveRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      lastActiveRef.current = document.activeElement;
      const focusTarget = panelRef.current?.querySelector('button, [href], select, input');
      focusTarget?.focus?.();
    } else if (lastActiveRef.current && typeof lastActiveRef.current.focus === 'function') {
      lastActiveRef.current.focus();
    }
  }, [open]);

  const updateTheme = (theme) => setA11y({ theme });
  const updateFontScale = (fontScale) => setA11y({ fontScale });
  const toggle = (key) => setA11y({ [key]: !settings[key] });

  const fontIndex = Math.max(0, FONT_SCALES.findIndex((value) => Math.abs(value - settings.fontScale) < 1e-3));

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir painel de acessibilidade"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="acessibilidade-fab"
      >
        <Accessibility size={22} aria-hidden="true" />
        <span className="acessibilidade-fab__label">Acessibilidade</span>
      </button>

      {open && (
        <div className="acessibilidade-overlay" role="presentation">
          <button
            type="button"
            aria-label="Fechar painel de acessibilidade"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="acessibilidade-backdrop"
          />
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="acessibilidade-panel"
          >
            <header className="acessibilidade-panel__header">
              <div className="acessibilidade-panel__title">
                <span className="acessibilidade-panel__icon" aria-hidden="true">
                  <Accessibility size={18} />
                </span>
                <div>
                  <h2 id={titleId}>Acessibilidade</h2>
                  <p>Ajuste a experiência para suas necessidades</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="acessibilidade-close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="acessibilidade-panel__body">
              <section className="acessibilidade-section">
                <h3>Tema</h3>
                <div className="acessibilidade-segment" role="radiogroup" aria-label="Tema de cores">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings.theme === 'light'}
                    className={settings.theme === 'light' ? 'is-active' : ''}
                    onClick={() => updateTheme('light')}
                  >
                    <Sun size={16} aria-hidden="true" />
                    <span>Claro</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings.theme === 'dark'}
                    className={settings.theme === 'dark' ? 'is-active' : ''}
                    onClick={() => updateTheme('dark')}
                  >
                    <Moon size={16} aria-hidden="true" />
                    <span>Escuro</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings.theme === 'system'}
                    className={settings.theme === 'system' ? 'is-active' : ''}
                    onClick={() => updateTheme('system')}
                  >
                    <span aria-hidden="true">⌬</span>
                    <span>Sistema</span>
                  </button>
                </div>
              </section>

              <section className="acessibilidade-section">
                <h3>
                  <Type size={14} aria-hidden="true" />
                  Tamanho do texto
                </h3>
                <div className="acessibilidade-segment acessibilidade-segment--compact" role="radiogroup" aria-label="Tamanho do texto">
                  {FONT_SCALES.map((value, index) => {
                    const active = index === fontIndex;
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`Tamanho ${index + 1} de ${FONT_SCALES.length}`}
                        key={value}
                        className={active ? 'is-active' : ''}
                        onClick={() => updateFontScale(value)}
                      >
                        <span style={{ fontSize: `${0.75 + index * 0.12}rem`, fontWeight: 600 }}>{FONT_LABELS[index]}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="acessibilidade-section">
                <h3>Recursos visuais</h3>
                <ul className="acessibilidade-toggles">
                  <ToggleRow
                    icon={<Contrast size={16} aria-hidden="true" />}
                    label="Alto contraste"
                    description="Texto branco em fundo preto, links destacados"
                    checked={!!settings.highContrast}
                    onChange={() => toggle('highContrast')}
                  />
                  <ToggleRow
                    icon={<Underline size={16} aria-hidden="true" />}
                    label="Sublinhar links"
                    description="Destaca todos os links com sublinhado"
                    checked={!!settings.underlineLinks}
                    onChange={() => toggle('underlineLinks')}
                  />
                  <ToggleRow
                    icon={<Pause size={16} aria-hidden="true" />}
                    label="Reduzir animações"
                    description="Desativa transições e movimentos"
                    checked={!!settings.reducedMotion}
                    onChange={() => toggle('reducedMotion')}
                  />
                  <ToggleRow
                    icon={<MousePointer2 size={16} aria-hidden="true" />}
                    label="Cursor ampliado"
                    description="Cursor maior e mais visível"
                    checked={!!settings.largeCursor}
                    onChange={() => toggle('largeCursor')}
                  />
                </ul>
              </section>

              <section className="acessibilidade-section">
                <h3>Espaçamento</h3>
                <div className="acessibilidade-slider-row">
                  <label htmlFor="acessibilidade-letter">Entre letras</label>
                  <input
                    id="acessibilidade-letter"
                    type="range"
                    min={0}
                    max={3}
                    step={0.5}
                    value={settings.letterSpacing}
                    onChange={(event) => setA11y({ letterSpacing: Number(event.target.value) })}
                  />
                  <span aria-hidden="true">{settings.letterSpacing}px</span>
                </div>
                <div className="acessibilidade-slider-row">
                  <label htmlFor="acessibilidade-line">Altura da linha</label>
                  <input
                    id="acessibilidade-line"
                    type="range"
                    min={1}
                    max={2.2}
                    step={0.1}
                    value={settings.lineHeight}
                    onChange={(event) => setA11y({ lineHeight: Number(event.target.value) })}
                  />
                  <span aria-hidden="true">{settings.lineHeight.toFixed(1)}</span>
                </div>
              </section>

              <button type="button" className="acessibilidade-reset" onClick={() => resetA11y()}>
                <RotateCcw size={15} aria-hidden="true" />
                Restaurar padrão
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function ToggleRow({ icon, label, description, checked, onChange }) {
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`acessibilidade-toggle ${checked ? 'is-on' : ''}`}
      >
        <span className="acessibilidade-toggle__icon" aria-hidden="true">{icon}</span>
        <span className="acessibilidade-toggle__text">
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
        <span className="acessibilidade-toggle__switch" aria-hidden="true">
          <span className="acessibilidade-toggle__thumb" />
        </span>
      </button>
    </li>
  );
}
