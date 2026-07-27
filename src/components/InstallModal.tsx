import React from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Monitor } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerInstall: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  onTriggerInstall
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="https://i.imgur.com/8RP9DL7.png"
              alt="Logo"
              className="w-8 h-8 object-contain bg-white rounded-lg p-0.5"
            />
            <div>
              <h3 className="text-sm font-bold">Instalar Aplicativo PWA</h3>
              <p className="text-[11px] text-red-100">Colégio Reação — Gestão</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-100 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <Download className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Acesso Rápido na Tela de Início
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instale o app do Colégio Reação no seu celular ou computador para receber notificações instantâneas e acessar offline.
            </p>
          </div>

          <button
            onClick={onTriggerInstall}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 shadow-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Instalar Agora</span>
          </button>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Instruções por Dispositivo
            </p>

            {/* iOS Safari */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold text-slate-800">
                <Smartphone className="w-4 h-4 text-slate-600" />
                <span>iPhone / iPad (Safari)</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-normal">
                1. Toque no botão <Share className="w-3 h-3 inline text-blue-600 mx-0.5" /> <strong>Compartilhar</strong> no Safari.<br />
                2. Selecione <PlusSquare className="w-3 h-3 inline text-slate-800 mx-0.5" /> <strong>Adicionar à Tela de Início</strong>.
              </p>
            </div>

            {/* Android / Chrome */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold text-slate-800">
                <Monitor className="w-4 h-4 text-slate-600" />
                <span>Android / Desktop (Chrome / Edge)</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-normal">
                Clique no botão "Instalar Agora" acima ou acesse o menu de 3 pontos do navegador e selecione "Instalar Colégio Reação".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
