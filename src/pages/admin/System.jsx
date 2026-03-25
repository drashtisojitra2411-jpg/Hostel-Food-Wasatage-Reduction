import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import SettingsPanel from '../../components/admin/SettingsPanel';

function Toggle({ checked, onChange }) {
    return (
        <button onClick={onChange} type="button" className={`w-12 h-7 rounded-full p-1 transition-all ${checked ? 'bg-creative-lime' : 'bg-white/20'}`}>
            <span className={`block w-5 h-5 rounded-full bg-black transition-all ${checked ? 'translate-x-5' : 'translate-x-0'}`}></span>
        </button>
    );
}

export default function System() {
    const [wasteThreshold, setWasteThreshold] = useState(15);
    const [aiSensitivity, setAiSensitivity] = useState(70);
    const [notifications, setNotifications] = useState(true);
    const [pickupRule, setPickupRule] = useState(true);
    const [backup, setBackup] = useState(false);

    return (
        <AdminLayout title="System Settings">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SettingsPanel title="Waste Alert Threshold" description={`Current threshold: ${wasteThreshold}%`}>
                    <input type="range" min="5" max="30" value={wasteThreshold} onChange={(e) => setWasteThreshold(Number(e.target.value))} className="w-full" />
                </SettingsPanel>
                <SettingsPanel title="AI Prediction Sensitivity" description={`Sensitivity: ${aiSensitivity}%`}>
                    <input type="range" min="20" max="100" value={aiSensitivity} onChange={(e) => setAiSensitivity(Number(e.target.value))} className="w-full" />
                </SettingsPanel>
                <SettingsPanel title="Notification Settings" description="Enable platform alerts and emails.">
                    <Toggle checked={notifications} onChange={() => setNotifications((s) => !s)} />
                </SettingsPanel>
                <SettingsPanel title="NGO Pickup Rules" description="Allow auto assignment for high-priority pickups.">
                    <Toggle checked={pickupRule} onChange={() => setPickupRule((s) => !s)} />
                </SettingsPanel>
                <SettingsPanel title="Data Backup" description="Enable nightly encrypted backups.">
                    <Toggle checked={backup} onChange={() => setBackup((s) => !s)} />
                </SettingsPanel>
            </div>
        </AdminLayout>
    );
}
