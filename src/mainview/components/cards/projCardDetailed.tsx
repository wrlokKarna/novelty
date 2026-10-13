import { IconBook, IconTrash } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useRPC } from '../../contexts/RPCContext';
import type { Project } from '../../types';

export default function ProjCardDetailed({ project }: { project: Project }) {
    const rpc = useRPC();
    const [coverImageSrc, setCoverImageSrc] = useState<string | null>(null);

    useEffect(() => {
        if (project.coverImageId) {
            rpc.request['db:get-asset'](project.coverImageId).then((asset) => {
                if (asset?.path) setCoverImageSrc(asset.path);
            });
        } else {
            setCoverImageSrc(null);
        }
    }, [project.coverImageId]);
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: '450px',
                minHeight: '250px',
                //backgroundColor: "#181818",
                backgroundColor: '#1e2230',
                border: '1px solid #2a2f3f',
                margin: '0px 24px 24px 0px',
                padding: '20px',
                borderRadius: '10px',
            }}
        >
            <div
                className="card-header"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <div
                    className=""
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        gap: '10px',
                        alignItems: 'center',
                    }}
                >
                    <div
                        className="icon proj-type"
                        style={{
                            /*backgroundColor: "#181818",*/
                            borderRadius: '6px',
                        }}
                    >
                        <IconBook stroke={2} size={24} color="#f0a050" />
                    </div>
                    <div className="title">
                        <h3 style={{ margin: '0px' }}>{project.name}</h3>
                    </div>
                    <div className="delete-proj" style={{ marginLeft: 'auto' }}>
                        <IconTrash size={16} stroke={2} />
                    </div>
                </div>
                <div className="" style={{ marginRight: 'auto' }}>
                    <div
                        className=""
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: '100px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            background: '#f0a05026',
                            color: '#f0a050',
                            textTransform: 'capitalize',
                            gap: '5px',
                        }}
                    >
                        <span className="active-genre" title="Active Genre">
                            romance
                        </span>
                        <span className=""> & </span>
                        <span
                            className="active-subgenre"
                            title="Active Subgenre"
                        >
                            fantasy
                        </span>
                    </div>
                    {project.contentRating &&
                        project.contentRating !== 'Unrated' && (
                            <span
                                style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    marginLeft: '8px',
                                    color: '#fff',
                                    ...(project.contentRating === 'G'
                                        ? { background: '#2d7d46' }
                                        : project.contentRating === 'PG'
                                          ? { background: '#2a6fdb' }
                                          : project.contentRating === 'PG-13'
                                            ? { background: '#c8a427' }
                                            : project.contentRating === 'R'
                                              ? { background: '#d96c1a' }
                                              : project.contentRating ===
                                                  'NC-17'
                                                ? { background: '#c72a2a' }
                                                : { background: '#555' }),
                                }}
                            >
                                {project.contentRating}
                            </span>
                        )}
                </div>
                <div
                    className="proj-progress"
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                    }}
                >
                    <div
                        className="progress-bar"
                        style={{
                            width: '100%',
                            height: '10px',
                            /*backgroundColor: "#181818",*/
                            backgroundColor: '#242836',
                            borderRadius: '6px',
                        }}
                    >
                        <div
                            className="progress-fill"
                            style={{
                                width: '0%',
                                height: '100%',
                                backgroundColor: '#f0a050',
                                borderRadius: '6px',
                            }}
                        ></div>
                    </div>
                    <div className="progress-text">0%</div>
                </div>
            </div>
            <div
                className="card-body"
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                {coverImageSrc ? (
                    <img
                        src={coverImageSrc}
                        alt={project.name}
                        style={{
                            width: '150px',
                            height: '200px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    <div
                        style={{
                            backgroundColor: '#181818',
                            width: '150px',
                            height: '200px',
                            borderRadius: '6px',
                        }}
                    ></div>
                )}
                <div className="metadata">
                    <div className="genres">
                        <p>Genres</p>
                        <ol
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '10px',
                                listStyle: 'none',
                            }}
                        >
                            {['Fantasy', 'Adventure'].map((genre) => (
                                <li key={genre}>{genre}</li>
                            ))}
                        </ol>
                    </div>
                    <div className="tags">
                        <p>Tags</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
