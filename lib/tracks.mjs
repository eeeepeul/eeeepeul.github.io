// The songs on the record, in the order of the tree in cell 3. A track with no file yet (src: null) shows in the list but cannot
// be played; fill in its title and file here when it is ready.
export const ARTIST = 'EPEUL'

export const TRACKS = [
  { id: 'track-1', title: '9+1', src: 'media/9-plus-1.mp3' },
  { id: 'track-2', title: 'if and only if', src: 'media/if-and-only-if.mp3' },
  { id: 'track-3', title: 'saffron', src: 'media/saffron.mp3' },
  { id: 'track-4', title: 'a&d', src: 'media/a-and-d.mp3' },
]

// The song the page opens on and plays by itself: the 2nd one (its place in TRACKS, counting from 0). The player starts
// it, and the tree in cell 3 opens on the same song.
export const FIRST_TRACK = 1
