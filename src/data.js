import { createStore } from 'redux'
import shortid from 'shortid'
import DB from './db'

export const viewStates = ['view', 'edit']
export const runStates = ['active', 'disabled']

// TODO: fact groups are _entitites_ (ie. they can be renamed, though a valid program has unique names)
// TODO: name collisions can be reconcilled by renaming, deleting, merging

const db = DB.withSchema({
    type: { type: 'ref' },
    label: { type: 'string' },
    children: { type: 'ref', many: true },
}, {
    [shortid.generate()]: {
        type: 'fact_group',
        label: 'Stations',
        children: [
            'Alewife', 'Davis', 'Porter', 'Harvard', 'Central', 'Kendall/MIT', 'Charles/MGH',
            'Park St', 'Downtown Crossing', 'South Station', 'Broadway', 'Andrew', 'JFK/UMass',
        ],
    },
    [shortid.generate()]: {
        type: 'fact_group',
        label: 'Lines',
        children: ['Red', 'Green', 'Blue', 'Orange'],
    },
},
(q) => q.known_atom(q.id).if(
    q.type(q.parent, 'fact_group'),
    q.children(q.parent, q.id)
))

const createReducer = (map, initState) => (state = initState, action) => {
    if (map[action.type]) {
        return map[action.type](state, action.payload, action)
    }
    return state
}

const rootReducer = createReducer({
    editItem: (db, { id, parentID }) => db
        .retractAll((q) => [q.edit(q._)])
        .push((q) => [q.edit(parentID ? q.children(parentID, id) : id)])
        .clone(),
    disableItem: (db, { id, parentID }) => db
        .push((q) => [q.disabled(parentID ? q.children(parentID, id) : id)])
        .clone(),
    enableItem: (db, { id, parentID }) => db
        .retractAll((q) => [q.disabled(parentID ? q.children(parentID, id) : id)])
        .clone(),
    createFactGroup: (db) => {
        const id = shortid.generate()
        return db.push({ [id]: { type: 'fact_group', label: 'New Group', firstEdit: true } })
            .retractAll((q) => [q.edit(q._)])
            .push((q) => [q.edit(id)])
            .clone()
    },
    updateFactGroup: (db, { value, id }) => {
        db.retractAll((q) => [q.label(id, q._)])
            .retractAll((q) => [q.edit(q._)])
            .push((q) => [q.label(id, value)])
        if (db.find(id, 'firstEdit')) {
            db.retractAll((q) => q.firstEdit(id, q._))
                .push((q) => [q.children(id, 'New Fact')])
                .push((q) => [q.edit(q.children(id, 'New Fact'))])
        }
        return db.clone()
    },
    // TODO: ought to handle empty string as a valid atom
    createFact: (db, { parentID }) => db
        .retractAll((q) => [q.edit(q._)])
        .push((q) => [q.children(parentID, 'New Fact')])
        .push((q) => [q.edit(q.children(parentID, 'New Fact'))])
        .clone(),
    // TODO: this should (?) preserve order
    // if so, then order needs to be explicit
    // also: duplicates
    updateFact: (db, { parentID, id, value }) => db
        .retractAll((q) => [q.edit(q._)])
        .retractAll((q) => [q.children(parentID, id)])
        .push((q) => [q.children(parentID, value)])
        .clone(),
    updateAndCreateNextFact: (db, { id, parentID, value }, action) => console.log(action) || db
        .retractAll((q) => [q.edit(q._)])
        .retractAll((q) => [q.children(parentID, id)])
        .push((q) => [q.children(parentID, value)])
        .push((q) => [q.children(parentID, 'New Fact')])
        .push((q) => [q.edit(q.children(parentID, 'New Fact'))])
        .clone(),
}, db)

export const store = createStore(rootReducer)
Object.defineProperty(window, 'db', { get: () => store.getState() })

const _dispatch = store.dispatch
store.dispatch = (type, payload) => {
    if (typeof type === 'string') {
        _dispatch({ type, payload })
    } else {
        _dispatch(type)
    }
}
