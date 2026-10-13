import styles from './projects.module.css';
import { useState } from 'react';

function ProjectsPage() {
    return <div>Projects Page - use the main app to manage projects</div>;
}

function AssetsPage() {
    return <div>Asset Library</div>;
}

function SettingsPage() {
    return <div>Settings</div>;
}

function Projects() {
    const [activeTab, setActiveTab] = useState('projects');

    function handleBtnClick(e: React.MouseEvent<HTMLButtonElement>) {
        console.log('button clicked', e.currentTarget.textContent);
        switch (e.currentTarget.textContent) {
            case 'projects':
                setActiveTab('projects');
                break;
            case 'asset library':
                setActiveTab('asset library');
                break;
            case 'settings':
                setActiveTab('settings');
                break;
            case 'archive':
                setActiveTab('archive');
                break;
            case 'templates':
                setActiveTab('templates');
                break;
        }
    }

    return (
        <>
            <header>
                <h2>novelty</h2>
                <div className={styles.nav}>
                    <button onClick={handleBtnClick}>projects</button>
                    <button onClick={handleBtnClick}>archive</button>
                    <button onClick={handleBtnClick}>templates</button>
                    <button onClick={handleBtnClick}>asset library</button>
                </div>
                <div className={styles.nav}>
                    <button>help</button>
                    <button onClick={handleBtnClick}>settings</button>
                </div>
            </header>
            <main>
                {activeTab === 'projects' && <ProjectsPage />}
                {activeTab === 'asset library' && <AssetsPage />}
                {activeTab === 'archive' && <div>Archive</div>}
                {activeTab === 'templates' && <div>Templates</div>}
                {activeTab === 'settings' && <SettingsPage />}
            </main>
        </>
    );
}
export default Projects;
