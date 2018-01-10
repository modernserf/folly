import { createStore } from 'redux'
import DB from './db'

export const viewStates = ['view', 'edit']
export const runStates = ['active', 'disabled']

const db = DB.withSchema({
    type: { type: 'ref' },
    children: { type: 'ref', many: true },
}, {
    Stations: {
        type: 'fact_group',
        children: [
            'Alewife', 'Davis', 'Porter', 'Harvard', 'Central', 'Kendall/MIT', 'Charles/MGH',
            'Park St', 'Downtown Crossing', 'South Station', 'Broadway', 'Andrew', 'JFK/UMass',
        ],
    },
    Lines: {
        type: 'fact_group',
        children: ['Red', 'Green', 'Blue', 'Orange'],
    },
},
(q) => q.disabled('Stations', 'Davis').if(),
(q) => q.disabled('Lines').if(),
(q) => q.edit('Stations', 'Porter').if(),
(q) => q.known_atom(q.id).if(
    q.type(q.parent, 'fact_group'),
    q.children(q.parent, q.id)
))

window.db = db

const createReducer = (map, initState) => (state = initState, action) => {
    if (map[action.type]) {
        return map[action.type](state, action.payload, action)
    }
    return state
}

const rootReducer = createReducer({
    // // both facts and groups
    // editItem: (db, { id }) =>
    //     db.patch(id, { viewState: 'edit' }),
    // disableItem: (db, { id }) => {
    //     const prevState = db.find(id, 'runState')
    //     return db.patch(id, { runState: cycle(runStates, prevState) })
    // },
    // createFactGroup: (db) => {
    //     const [, next] = db.insert({
    //         ...factGroup(),
    //         viewState: 'edit',
    //         firstEdit: true,
    //     })
    //     return next
    // },
    // updateFactGroup: (db, { value, id }) => {
    //     const children = db.findAll(id, 'children')
    //     if (db.find(id, 'firstEdit')) {
    //         let [childID, next] = db.insert({
    //             ...fact(),
    //             viewState: 'edit',
    //         })
    //         children.push(childID)
    //         db = next
    //     }
    //     return db.patch(id, {
    //         label: value || 'New Group',
    //         firstEdit: false,
    //         viewState: 'view',
    //         children,
    //     })
    // },
    // createFact: (db, { parentID }) => {
    //     const [id, next] = db.insert({
    //         ...fact(),
    //         viewState: 'edit',
    //     })
    //     return next.push([parentID, 'children', id])
    // },
    // updateFact: (db, { id, value }) => {
    //     return db.patch(id, {
    //         label: value || 'New Fact',
    //         viewState: 'view',
    //     })
    // },
    // updateAndCreateNextFact: (db, { id, parentID, value }) => {
    //     const next = db.patch(id, {
    //         label: value || 'New Fact',
    //         viewState: 'view',
    //     })
    //     const [newID, next2] = next.insert({
    //         ...fact(),
    //         viewState: 'edit',
    //     })
    //
    //     return next2.push([parentID, 'children', newID])
    // },
}, db)

export const store = createStore(rootReducer)

const _dispatch = store.dispatch
store.dispatch = (type, payload) => {
    if (typeof type === 'string') {
        _dispatch({ type, payload })
    } else {
        _dispatch(type)
    }
}
