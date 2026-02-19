import { useEffect, useState } from 'react';
import { getYoutube, addYoutubeChannel, removeYoutubeChannel, addYoutubeVideo } from '../api';
import { Youtube, Plus, Trash2, ExternalLink, Tv, Video, X } from 'lucide-react';

export default function YouTube() {
  const [channels, setChannels] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', url: '' });
  const [newVideo, setNewVideo] = useState({ title: '', url: '' });

  const refresh = () => {
    getYoutube()
      .then(data => {
        setChannels(data.channels || []);
        setVideos(data.videos || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const handleAddChannel = async () => {
    if (!newChannel.name || !newChannel.url) return;
    await addYoutubeChannel(newChannel.name, newChannel.url);
    setNewChannel({ name: '', url: '' });
    setShowAddChannel(false);
    refresh();
  };

  const handleRemoveChannel = async (url: string) => {
    await removeYoutubeChannel(url);
    refresh();
  };

  const handleAddVideo = async () => {
    if (!newVideo.title || !newVideo.url) return;
    await addYoutubeVideo(newVideo.title, newVideo.url);
    setNewVideo({ title: '', url: '' });
    setShowAddVideo(false);
    refresh();
  };

  return (
    <>
      <div className="main-header">
        <Youtube size={20} /> YouTube Watcher
      </div>
      <div className="main-content">
        {loading ? (
          <div className="card-desc">Loading...</div>
        ) : (
          <>
            {/* Channels Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tv size={16} /> Channels ({channels.length})
              </h3>
              <button
                onClick={() => setShowAddChannel(!showAddChannel)}
                style={{
                  padding: '6px 14px', background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
                }}
              >
                {showAddChannel ? <X size={14} /> : <Plus size={14} />}
                {showAddChannel ? 'Cancel' : 'Add Channel'}
              </button>
            </div>

            {showAddChannel && (
              <div className="card" style={{ cursor: 'default', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    placeholder="Channel name"
                    value={newChannel.name}
                    onChange={e => setNewChannel({ ...newChannel, name: e.target.value })}
                    style={{
                      flex: 1, minWidth: 150, padding: '10px 14px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                      fontSize: 14, fontFamily: 'Fira Sans, sans-serif', outline: 'none',
                    }}
                  />
                  <input
                    placeholder="https://www.youtube.com/@channel"
                    value={newChannel.url}
                    onChange={e => setNewChannel({ ...newChannel, url: e.target.value })}
                    style={{
                      flex: 2, minWidth: 250, padding: '10px 14px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                      fontSize: 14, fontFamily: 'Fira Sans, sans-serif', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddChannel}
                    style={{
                      padding: '10px 20px', background: 'var(--green)', color: 'white',
                      border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                      fontFamily: 'Fira Sans, sans-serif',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {channels.map((ch: any) => (
              <div key={ch.url} className="card" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Youtube size={16} style={{ color: '#FF0000' }} />
                      {ch.name}
                    </div>
                    <div className="card-desc">{ch.url}</div>
                    {ch.videos && ch.videos.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {ch.videos.map((v: any, i: number) => (
                          <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <Video size={12} />
                            <a href={v.url} target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                              {v.title}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={ch.url} target="_blank" rel="noopener" style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => handleRemoveChannel(ch.url)}
                      style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Added: {ch.addedAt}</div>
              </div>
            ))}

            {channels.length === 0 && (
              <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 30 }}>
                <Tv size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <div className="card-desc">No channels tracked yet</div>
              </div>
            )}

            {/* Saved Videos Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Video size={16} /> Saved Videos ({videos.length})
              </h3>
              <button
                onClick={() => setShowAddVideo(!showAddVideo)}
                style={{
                  padding: '6px 14px', background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
                }}
              >
                {showAddVideo ? <X size={14} /> : <Plus size={14} />}
                {showAddVideo ? 'Cancel' : 'Add Video'}
              </button>
            </div>

            {showAddVideo && (
              <div className="card" style={{ cursor: 'default', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    placeholder="Video title"
                    value={newVideo.title}
                    onChange={e => setNewVideo({ ...newVideo, title: e.target.value })}
                    style={{
                      flex: 1, minWidth: 150, padding: '10px 14px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                      fontSize: 14, fontFamily: 'Fira Sans, sans-serif', outline: 'none',
                    }}
                  />
                  <input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={newVideo.url}
                    onChange={e => setNewVideo({ ...newVideo, url: e.target.value })}
                    style={{
                      flex: 2, minWidth: 250, padding: '10px 14px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                      fontSize: 14, fontFamily: 'Fira Sans, sans-serif', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddVideo}
                    style={{
                      padding: '10px 20px', background: 'var(--green)', color: 'white',
                      border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                      fontFamily: 'Fira Sans, sans-serif',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {videos.map((v: any, i: number) => (
              <div key={i} className="card" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Video size={14} style={{ color: '#FF0000' }} />
                      {v.title}
                    </div>
                    <div className="card-desc" style={{ marginTop: 4 }}>{v.addedAt}</div>
                  </div>
                  <a href={v.url} target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            ))}

            {videos.length === 0 && (
              <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 30 }}>
                <Video size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <div className="card-desc">No saved videos</div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
