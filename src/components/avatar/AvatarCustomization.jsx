import React, { useEffect, useId, useState } from 'react';
import { appClient } from '@/api/appClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Palette, Shirt, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const createInitialCustomization = (profile) => ({
  skin_color: profile?.avatar_customization?.skin_color || 'amber-200',
  body_color: profile?.avatar_customization?.body_color || 'white',
  pants_color: profile?.avatar_customization?.pants_color || 'blue-400',
  accessory: profile?.avatar_customization?.accessory || 'none'
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return { r: 128, g: 128, b: 128 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

const shadeHex = (hex, amount) => {
  const rgb = hexToRgb(hex);
  const factor = amount / 100;
  return rgbToHex({
    r: rgb.r + (factor >= 0 ? (255 - rgb.r) * factor : rgb.r * factor),
    g: rgb.g + (factor >= 0 ? (255 - rgb.g) * factor : rgb.g * factor),
    b: rgb.b + (factor >= 0 ? (255 - rgb.b) * factor : rgb.b * factor)
  });
};

const resolveColor = (palette, value, fallback) =>
  palette.find((item) => item.value === value)?.hex || fallback;

export default function AvatarCustomization({ profile, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [customization, setCustomization] = useState(() => createInitialCustomization(profile));

  useEffect(() => {
    if (!isOpen) return;
    setCustomization(createInitialCustomization(profile));
  }, [isOpen, profile?.id]);

  const updateAvatarMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) {
        throw new Error('Perfil ainda não foi carregado. Tente novamente em alguns segundos.');
      }
      await appClient.entities.UserProfile.update(profile.id, {
        avatar_customization: customization
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast({ title: 'Avatar atualizado', description: 'Sua personalização foi salva.' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Falha ao salvar avatar',
        description: error?.message || 'Tente novamente em alguns segundos.',
        variant: 'destructive'
      });
    }
  });

  const skinColors = [
    { value: 'amber-200', label: 'Claro', hex: '#f9d49c' },
    { value: 'orange-200', label: 'Médio', hex: '#e9bf93' },
    { value: 'orange-300', label: 'Bronzeado', hex: '#c98e62' },
    { value: 'amber-600', label: 'Escuro', hex: '#8b5a34' }
  ];

  const bodyColors = [
    { value: 'white', label: 'Branco', hex: '#f8fafc' },
    { value: 'red-400', label: 'Vermelho', hex: '#ef4444' },
    { value: 'blue-400', label: 'Azul', hex: '#3b82f6' },
    { value: 'green-400', label: 'Verde', hex: '#22c55e' },
    { value: 'purple-400', label: 'Roxo', hex: '#a855f7' },
    { value: 'yellow-400', label: 'Amarelo', hex: '#facc15' },
    { value: 'pink-400', label: 'Rosa', hex: '#ec4899' },
    { value: 'gray-800', label: 'Preto', hex: '#1f2937' }
  ];

  const pantsColors = [
    { value: 'blue-400', label: 'Azul', hex: '#3b82f6' },
    { value: 'gray-700', label: 'Cinza', hex: '#374151' },
    { value: 'green-600', label: 'Verde', hex: '#16a34a' },
    { value: 'red-500', label: 'Vermelho', hex: '#ef4444' },
    { value: 'purple-500', label: 'Roxo', hex: '#9333ea' },
    { value: 'indigo-600', label: 'Índigo', hex: '#4f46e5' }
  ];

  const accessories = [
    { value: 'none', label: 'Nenhum', icon: '✖', unlock_level: 1 },
    { value: 'cap', label: 'Boné', icon: '🧢', unlock_level: 5 },
    { value: 'sunglasses', label: 'Óculos', icon: '🕶️', unlock_level: 10 },
    { value: 'crown', label: 'Coroa', icon: '👑', unlock_level: 20 },
    { value: 'headband', label: 'Bandana', icon: '🏁', unlock_level: 15 },
    { value: 'medal', label: 'Medalha', icon: '🏅', unlock_level: 25 }
  ];

  const PreviewAvatar = ({ skin, body, pants, accessory, level }) => {
    const idBase = useId().replace(/:/g, '');

    const skinHex = resolveColor(skinColors, skin, '#e8bc8f');
    const shirtHex = resolveColor(bodyColors, body, '#f8fafc');
    const pantsHex = resolveColor(pantsColors, pants, '#3b82f6');
    const accessoryBase = {
      none: '#94a3b8',
      cap: '#0ea5e9',
      sunglasses: '#111827',
      crown: '#f59e0b',
      headband: '#ef4444',
      medal: '#d97706'
    }[accessory] || '#94a3b8';

    const skinLight = shadeHex(skinHex, 18);
    const skinDark = shadeHex(skinHex, -18);
    const shirtLight = shadeHex(shirtHex, 20);
    const shirtDark = shadeHex(shirtHex, -16);
    const pantsLight = shadeHex(pantsHex, 14);
    const pantsDark = shadeHex(pantsHex, -18);
    const accLight = shadeHex(accessoryBase, 22);
    const accDark = shadeHex(accessoryBase, -24);

    const renderAccessory = () => {
      if (accessory === 'cap') {
        return (
          <g>
            <path d="M81 59c9-15 23-24 39-24s30 9 39 24v8H81z" fill={`url(#${idBase}-acc)`} />
            <path d="M159 67c11 1 19 5 25 11-8 4-19 5-29 4z" fill={accDark} />
          </g>
        );
      }
      if (accessory === 'sunglasses') {
        return (
          <g>
            <rect x="96" y="62" width="22" height="10" rx="4" fill={accDark} />
            <rect x="122" y="62" width="22" height="10" rx="4" fill={accDark} />
            <rect x="117" y="65" width="6" height="3" rx="1.5" fill="#64748b" />
          </g>
        );
      }
      if (accessory === 'crown') {
        return (
          <g>
            <path d="M85 56l13 12 22-17 22 17 13-12 7 24H78z" fill={`url(#${idBase}-acc)`} />
            <circle cx="98" cy="72" r="3" fill="#fde68a" />
            <circle cx="120" cy="67" r="3.8" fill="#fef08a" />
            <circle cx="142" cy="72" r="3" fill="#fde68a" />
          </g>
        );
      }
      if (accessory === 'headband') {
        return (
          <g>
            <rect x="86" y="61" width="68" height="10" rx="5" fill={`url(#${idBase}-acc)`} />
            <rect x="142" y="61" width="12" height="10" rx="3" fill={accDark} />
          </g>
        );
      }
      if (accessory === 'medal') {
        return (
          <g>
            <path d="M109 106h22l-6 28h-10z" fill="#dc2626" />
            <path d="M120 106h11l-6 28h-5z" fill="#991b1b" />
            <circle cx="120" cy="143" r="12.5" fill={`url(#${idBase}-acc)`} />
            <circle cx="120" cy="143" r="8" fill="#fef3c7" />
            <path d="M116 143l3 3 5-6" fill="none" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );
      }
      return null;
    };

    return (
      <div className="relative mx-auto h-56 w-56">
        <div
          className="absolute inset-0 rounded-[2rem] border border-white/70 shadow-inner"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.90), rgba(219,234,254,0.60) 45%, rgba(209,250,229,0.70))'
          }}
        />
        <svg
          viewBox="0 0 240 240"
          className="relative z-10 mx-auto h-56 w-56 drop-shadow-[0_12px_18px_rgba(15,23,42,0.22)]"
          aria-label="Preview detalhado do avatar"
          role="img"
        >
          <defs>
            <linearGradient id={`${idBase}-skin`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={skinLight} />
              <stop offset="100%" stopColor={skinDark} />
            </linearGradient>
            <linearGradient id={`${idBase}-shirt`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={shirtLight} />
              <stop offset="100%" stopColor={shirtDark} />
            </linearGradient>
            <linearGradient id={`${idBase}-pants`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={pantsLight} />
              <stop offset="100%" stopColor={pantsDark} />
            </linearGradient>
            <linearGradient id={`${idBase}-acc`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accLight} />
              <stop offset="100%" stopColor={accDark} />
            </linearGradient>
            <linearGradient id={`${idBase}-hair`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
          </defs>

          <ellipse cx="120" cy="212" rx="42" ry="9" fill="rgba(15,23,42,0.10)" />

          <rect x="84" y="97" width="72" height="90" rx="28" fill={`url(#${idBase}-shirt)`} />
          <path d="M91 111c11-9 47-9 58 0v16H91z" fill="rgba(255,255,255,0.22)" />
          <rect x="112" y="95" width="16" height="10" rx="4" fill={shadeHex(skinHex, -10)} />
          <rect x="108" y="103" width="24" height="8" rx="3" fill="rgba(255,255,255,0.30)" />

          <rect x="69" y="110" width="16" height="56" rx="8" fill={`url(#${idBase}-skin)`} />
          <rect x="155" y="110" width="16" height="56" rx="8" fill={`url(#${idBase}-skin)`} />
          <circle cx="77" cy="166" r="8" fill={shadeHex(skinHex, -20)} />
          <circle cx="163" cy="166" r="8" fill={shadeHex(skinHex, -20)} />

          <rect x="91" y="170" width="23" height="44" rx="10" fill={`url(#${idBase}-pants)`} />
          <rect x="126" y="170" width="23" height="44" rx="10" fill={`url(#${idBase}-pants)`} />
          <rect x="90" y="208" width="25" height="10" rx="5" fill="#0f172a" opacity="0.9" />
          <rect x="125" y="208" width="25" height="10" rx="5" fill="#0f172a" opacity="0.9" />

          <circle cx="120" cy="63" r="31" fill={`url(#${idBase}-skin)`} />
          <ellipse cx="88" cy="66" rx="5" ry="8" fill={shadeHex(skinHex, -16)} />
          <ellipse cx="152" cy="66" rx="5" ry="8" fill={shadeHex(skinHex, -16)} />
          <path
            d="M89 70c0-22 14-39 31-39 22 0 33 15 33 34 0 5-1 9-4 13-7-8-18-12-29-12-12 0-22 3-31 8z"
            fill={`url(#${idBase}-hair)`}
          />
          <circle cx="108" cy="66" r="3" fill="#0f172a" />
          <circle cx="132" cy="66" r="3" fill="#0f172a" />
          <path d="M111 79c3 3 15 3 18 0" fill="none" stroke="#7c2d12" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M118 67c1 3 1 6-1 9" fill="none" stroke={shadeHex(skinHex, -25)} strokeWidth="1.7" strokeLinecap="round" />

          {level > 10 && (
            <g>
              <rect x="96" y="122" width="8" height="14" rx="2" fill="#cbd5e1" opacity="0.75" />
              <rect x="136" y="122" width="8" height="14" rx="2" fill="#cbd5e1" opacity="0.75" />
            </g>
          )}

          {renderAccessory()}
        </svg>

        <div className="absolute right-3 top-3 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
          Nível {level || 1}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette size={24} />
            Personalizar Avatar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-sky-50 to-cyan-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Preview 3D</h3>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-gray-600">
                Mais detalhado
              </span>
            </div>
            <PreviewAvatar
              skin={customization.skin_color}
              body={customization.body_color}
              pants={customization.pants_color}
              accessory={customization.accessory}
              level={profile?.level || 1}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <User size={20} className="text-gray-600" />
              <label className="font-semibold text-gray-700">Cor da pele</label>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {skinColors.map((color) => (
                <button
                  type="button"
                  key={color.value}
                  onClick={() => setCustomization({ ...customization, skin_color: color.value })}
                  className={`rounded-xl border-2 p-3 transition-all ${
                    customization.skin_color === color.value
                      ? 'border-emerald-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="h-6 w-full rounded-md" style={{ backgroundColor: color.hex }} />
                  <p className="mt-2 text-xs font-medium text-gray-700">{color.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Shirt size={20} className="text-gray-600" />
              <label className="font-semibold text-gray-700">Cor da roupa</label>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {bodyColors.map((color) => (
                <button
                  type="button"
                  key={color.value}
                  onClick={() => setCustomization({ ...customization, body_color: color.value })}
                  className={`rounded-xl border-2 p-3 transition-all ${
                    customization.body_color === color.value
                      ? 'border-emerald-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="h-6 w-full rounded-md" style={{ backgroundColor: color.hex }} />
                  <p className="mt-2 text-xs font-medium text-gray-700">{color.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Shirt size={20} className="text-gray-600" />
              <label className="font-semibold text-gray-700">Cor da calça</label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {pantsColors.map((color) => (
                <button
                  type="button"
                  key={color.value}
                  onClick={() => setCustomization({ ...customization, pants_color: color.value })}
                  className={`rounded-xl border-2 p-3 transition-all ${
                    customization.pants_color === color.value
                      ? 'border-emerald-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="h-6 w-full rounded-md" style={{ backgroundColor: color.hex }} />
                  <p className="mt-2 text-xs font-medium text-gray-700">{color.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Crown size={20} className="text-gray-600" />
              <label className="font-semibold text-gray-700">Acessórios</label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {accessories.map((acc) => {
                const isLocked = (profile?.level || 1) < acc.unlock_level;
                return (
                  <button
                    type="button"
                    key={acc.value}
                    onClick={() => !isLocked && setCustomization({ ...customization, accessory: acc.value })}
                    disabled={isLocked}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      customization.accessory === acc.value
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="mb-2 text-3xl">{acc.icon}</div>
                    <p className="text-xs font-medium text-gray-700">{acc.label}</p>
                    {isLocked && <p className="mt-1 text-xs text-red-500">Nv. {acc.unlock_level}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 border-t pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => updateAvatarMutation.mutate()}
              disabled={updateAvatarMutation.isPending}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              {updateAvatarMutation.isPending ? 'Salvando...' : 'Salvar avatar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
