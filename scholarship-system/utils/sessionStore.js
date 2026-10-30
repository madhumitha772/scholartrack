// MongoDB-backed session store (no extra package needed). Sessions survive server restarts
// and expire automatically through a TTL index.
const session = require("express-session");
const mongoose = require("mongoose");

class MongoSessionStore extends session.Store {
    constructor({ collection = "sessions" } = {}) {
        super();
        this.collectionName = collection;
        this.indexed = false;
    }

    get col() {
        const col = mongoose.connection.collection(this.collectionName);
        if (!this.indexed) {
            this.indexed = true;
            col.createIndex({ expires: 1 }, { expireAfterSeconds: 0 }).catch(() => { this.indexed = false; });
        }
        return col;
    }

    expiry(sess) {
        if (sess?.cookie?.expires) return new Date(sess.cookie.expires);
        const maxAge = sess?.cookie?.maxAge || 8 * 3600 * 1000;
        return new Date(Date.now() + maxAge);
    }

    get(sid, cb) {
        this.col.findOne({ _id: sid, expires: { $gt: new Date() } })
            .then(doc => cb(null, doc ? JSON.parse(doc.data) : null))
            .catch(cb);
    }

    set(sid, sess, cb = () => {}) {
        this.col.updateOne({ _id: sid }, { $set: { data: JSON.stringify(sess), expires: this.expiry(sess) } }, { upsert: true })
            .then(() => cb(null)).catch(cb);
    }

    touch(sid, sess, cb = () => {}) {
        this.col.updateOne({ _id: sid }, { $set: { expires: this.expiry(sess) } })
            .then(() => cb(null)).catch(cb);
    }

    destroy(sid, cb = () => {}) {
        this.col.deleteOne({ _id: sid }).then(() => cb(null)).catch(cb);
    }
}

module.exports = MongoSessionStore;
