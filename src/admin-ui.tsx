import { useState, type ReactNode } from 'react';

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      {hint ? <span className="admin-field__hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function AdminToggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`admin-toggle ${disabled ? 'is-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function AdminFormCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  collapsible = false,
  defaultOpen = true,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <article
      className={`admin-card admin-form-card ${collapsible ? 'admin-form-card--collapsible' : ''} ${isOpen ? 'is-open' : 'is-collapsed'} ${className}`.trim()}
    >
      <div className="admin-form-card__head">
        <div>
          {eyebrow ? <p className="admin-section__eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
          {description ? <p className="admin-muted-text">{description}</p> : null}
        </div>
        {(actions || collapsible) ? (
          <div className="admin-form-card__actions">
            {actions ? <div className="admin-form-card__actions-slot">{actions}</div> : null}
            {collapsible ? (
              <button
                className="admin-utility-button admin-form-card__toggle"
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((current) => !current)}
              >
                {isOpen ? 'Ocultar' : 'Abrir'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {!collapsible || isOpen ? <div className="admin-form-card__body">{children}</div> : null}
    </article>
  );
}

export function AdminPreviewCard({
  eyebrow,
  title,
  description,
  children,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`admin-card admin-preview-card ${className}`.trim()}>
      <div className="admin-preview-card__head">
        <div className="admin-preview-card__copy">
          {eyebrow ? <p className="admin-section__eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
          {description ? <p className="admin-muted-text">{description}</p> : null}
        </div>
      </div>
      <div className="admin-preview-card__body">{children}</div>
    </article>
  );
}

export interface AdminSectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function AdminSectionHeading({ eyebrow, title, description }: AdminSectionHeadingProps) {
  return (
    <div className="admin-section__head">
      <p className="admin-section__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <p className="admin-muted-text">{description}</p> : null}
    </div>
  );
}

export interface AdminStatItem {
  label: string;
  value: ReactNode;
  detail: string;
  icon?: string;
  className?: string;
}

export function AdminStatCard({ label, value, detail, icon, className = '' }: AdminStatItem) {
  return (
    <article className={`admin-card admin-stat-card ${className}`.trim()}>
      {icon ? (
        <div className="admin-stat-card__icon">
          <i className={icon} />
        </div>
      ) : null}
      <div className="admin-stat-card__copy">
        <span className="admin-stat-card__label">{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

export function AdminStatsGrid({
  items,
  ariaLabel,
  className = 'admin-stats',
}: {
  items: AdminStatItem[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <section className={className} aria-label={ariaLabel}>
      {items.map((item) => (
        <AdminStatCard key={item.label} {...item} />
      ))}
    </section>
  );
}

export function AdminInlineTip({
  icon,
  children,
  className = '',
}: {
  icon: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`admin-inline-tip ${className}`.trim()}>
      <i className={icon} />
      <p>{children}</p>
    </div>
  );
}

export function AdminEmptyState({
  icon,
  title,
  description,
  className = 'admin-card',
}: {
  icon: string;
  title: string;
  description: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${className} admin-empty-panel`.trim()}>
      <i className={icon} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
