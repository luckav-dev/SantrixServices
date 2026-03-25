import type { AdminMemberRecord } from './supabase-admin-members';
import {
  AdminField,
  AdminFormCard,
  AdminInlineTip,
  AdminSectionHeading,
  type AdminStatItem,
  AdminStatsGrid,
} from './admin-ui';

interface AdminRoleSummary {
  owner: number;
  admin: number;
  editor: number;
}

interface AdminAdminsSectionProps {
  isRemoteAdminAuth: boolean;
  isAdminMembersReady: boolean;
  adminMembersError: string;
  adminAccessStats: AdminStatItem[];
  adminRoleSummary: AdminRoleSummary;
  adminMembers: AdminMemberRecord[];
  canManageAdmins: boolean;
  isAdminActionBusy: boolean;
  adminLookup: string;
  adminRoleDraft: AdminMemberRecord['role'];
  adminActionMessage: string;
  onAdminLookupChange: (value: string) => void;
  onAdminRoleDraftChange: (role: AdminMemberRecord['role']) => void;
  onAddAdminMember: () => void | Promise<void>;
  onAdminRoleChange: (userId: string, role: AdminMemberRecord['role']) => void | Promise<void>;
  onRemoveAdmin: (userId: string) => void | Promise<void>;
  formatAdminDate: (value: string) => string;
  getAdminInitials: (value: string | null | undefined) => string;
}

export function AdminAdminsSection({
  isRemoteAdminAuth,
  isAdminMembersReady,
  adminMembersError,
  adminAccessStats,
  adminRoleSummary,
  adminMembers,
  canManageAdmins,
  isAdminActionBusy,
  adminLookup,
  adminRoleDraft,
  adminActionMessage,
  onAdminLookupChange,
  onAdminRoleDraftChange,
  onAddAdminMember,
  onAdminRoleChange,
  onRemoveAdmin,
  formatAdminDate,
  getAdminInitials,
}: AdminAdminsSectionProps) {
  return (
    <section className="admin-section" id="admins">
      <AdminSectionHeading eyebrow="Admins" title="Miembros del dashboard" />

      {!isRemoteAdminAuth ? (
        <div className="admin-card admin-empty-panel">
          <i className="fa-solid fa-database" />
          <h3>Disponible en modo Supabase</h3>
          <p>Los roles y miembros del panel se gestionan desde `storefront_admin_members`.</p>
        </div>
      ) : !isAdminMembersReady ? (
        <div className="admin-card admin-empty-panel">
          <div className="checkout-stage__loader" />
          <p>Cargando miembros reales del panel...</p>
        </div>
      ) : adminMembersError ? (
        <div className="admin-card admin-empty-panel">
          <i className="fa-solid fa-triangle-exclamation" />
          <h3>No se pudieron cargar los miembros</h3>
          <p>{adminMembersError}</p>
        </div>
      ) : (
        <>
          <AdminStatsGrid
            items={adminAccessStats}
            ariaLabel="Resumen rápido de miembros y permisos"
            className="admin-grid admin-grid--stats"
          />

          <div className="admin-editor-column">
            <AdminFormCard
              eyebrow="Team"
              title="Miembros actuales"
              description="Usuarios vinculados a `storefront_admin_members` para esta tienda."
              actions={<span className="admin-pill">{adminMembers.length} miembros</span>}
              collapsible
            >
              <div className="admin-key-metrics">
                <div>
                  <span>Owners</span>
                  <strong>{adminRoleSummary.owner}</strong>
                </div>
                <div>
                  <span>Admins</span>
                  <strong>{adminRoleSummary.admin}</strong>
                </div>
                <div>
                  <span>Editors</span>
                  <strong>{adminRoleSummary.editor}</strong>
                </div>
              </div>

              <div className="admin-stack">
                {adminMembers.map((member) => (
                  <article className="admin-group-card admin-member-card" key={member.userId}>
                    <div className="admin-card__title-row admin-list-card__head">
                      <div className="admin-list-card__identity">
                        <span className="admin-list-card__avatar">
                          {getAdminInitials(member.email || member.userId)}
                        </span>
                        <div>
                          <h3>{member.email ?? member.userId}</h3>
                          <p className="admin-muted-text">{member.userId}</p>
                        </div>
                      </div>
                      <span className="admin-pill">{member.role}</span>
                    </div>

                    <div className="admin-detail-list">
                      <div>
                        <span>Creado</span>
                        <strong>{formatAdminDate(member.createdAt)}</strong>
                      </div>
                      <div>
                        <span>Actualizado</span>
                        <strong>{formatAdminDate(member.updatedAt)}</strong>
                      </div>
                    </div>

                    <div className="admin-row admin-row--wrap">
                      <select
                        value={member.role}
                        disabled={!canManageAdmins || isAdminActionBusy}
                        onChange={(event) =>
                          void onAdminRoleChange(
                            member.userId,
                            event.currentTarget.value as AdminMemberRecord['role'],
                          )
                        }
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        className="admin-button admin-button--danger admin-button--small"
                        type="button"
                        disabled={!canManageAdmins || isAdminActionBusy}
                        onClick={() => void onRemoveAdmin(member.userId)}
                      >
                        Quitar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </AdminFormCard>

            <AdminFormCard
              eyebrow="Owner only"
              title="Vincular miembro"
              description="La cuenta debe existir antes en Supabase Auth. Aquí solo enlazas el usuario a la tienda y eliges el rol."
              actions={<span className="admin-pill">{canManageAdmins ? 'Owner only' : 'Read only'}</span>}
              collapsible
              defaultOpen={false}
            >
              <div className="admin-grid admin-grid--2">
                <AdminField label="Email o user id" hint="La cuenta ya debe existir en Supabase Auth">
                  <input
                    value={adminLookup}
                    disabled={!canManageAdmins || isAdminActionBusy}
                    onChange={(event) => onAdminLookupChange(event.currentTarget.value)}
                  />
                </AdminField>

                <AdminField label="Rol">
                  <select
                    value={adminRoleDraft}
                    disabled={!canManageAdmins || isAdminActionBusy}
                    onChange={(event) =>
                      onAdminRoleDraftChange(event.currentTarget.value as AdminMemberRecord['role'])
                    }
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </AdminField>
              </div>

              <AdminInlineTip icon="fa-solid fa-user-shield">
                Solo el <strong>owner</strong> puede añadir, quitar o cambiar roles. El usuario debe existir primero
                en <strong> Supabase Auth</strong>.
              </AdminInlineTip>

              {adminActionMessage ? <p className="admin-auth__error">{adminActionMessage}</p> : null}

              <div className="admin-row admin-row--wrap">
                <button
                  className="admin-button admin-button--primary"
                  type="button"
                  disabled={!canManageAdmins || isAdminActionBusy}
                  onClick={() => void onAddAdminMember()}
                >
                  {isAdminActionBusy ? 'Guardando...' : 'Vincular miembro'}
                </button>
              </div>
            </AdminFormCard>
          </div>
        </>
      )}
    </section>
  );
}
