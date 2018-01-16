import DB from './db'

const simpsons = [
    { parent: 'Abe', child: 'Homer' },
    { parent: 'Mona', child: 'Homer' },
    { parent: 'Clancy', child: 'Marge' },
    { parent: 'Jacqueline', child: 'Marge' },
    { parent: 'Clancy', child: 'Patty' },
    { parent: 'Jacqueline', child: 'Patty' },
    { parent: 'Clancy', child: 'Selma' },
    { parent: 'Jacqueline', child: 'Selma' },
    { parent: 'Homer', child: 'Bart' },
    { parent: 'Homer', child: 'Lisa' },
    { parent: 'Homer', child: 'Maggie' },
    { parent: 'Marge', child: 'Bart' },
    { parent: 'Marge', child: 'Lisa' },
    { parent: 'Marge', child: 'Maggie' },
    (q) => [
        { grandparent: q.grandparent, grandchild: q.grandchild },
        { parent: q.grandparent, child: q.middle },
        { parent: q.middle, child: q.grandchild },
    ],
]

it('finds facts', () => {
    const db = new DB(simpsons)
    const results = db.query((q) => [
        { parent: 'Homer', child: q.child },
    ]).all()
    expect(results.map(x => x.child).sort()).toEqual(['Bart', 'Lisa', 'Maggie'])
})

it('chains queries', () => {
    const db = new DB(simpsons)
    const results = db.query((q) => [
        { parent: 'Abe', child: q.child },
        { parent: q.child, child: q.grandchild },
    ]).all()
    expect(results.map(x => x.grandchild).sort()).toEqual(['Bart', 'Lisa', 'Maggie'])
})

it('chains queries in arbitrary order', () => {
    const db = new DB(simpsons)

    const results = db.query((q) => [
        { parent: q.child, child: q.grandchild },
        { parent: 'Abe', child: q.child },
    ]).all()

    expect(results.map(x => x.grandchild).sort()).toEqual(['Bart', 'Lisa', 'Maggie'])
})

it('handles rules', () => {
    const db = new DB(simpsons)

    const results = db.query((q) => [
        { grandparent: q.grandparent, grandchild: 'Lisa' },
    ]).all()

    expect(results.map((x) => x.grandparent).sort()).toEqual(['Abe', 'Clancy', 'Jacqueline', 'Mona'])
})

it('basic dif', () => {
    const db = new DB(simpsons)

    const results = db.query((q) => [
        { parent: 'Homer', child: q.child },
        { it: q.child, not: 'Bart' },
    ]).all()

    expect(results.map(x => x.child).sort()).toEqual(['Lisa', 'Maggie'])
})

it('delayed dif', () => {
    const db = new DB(simpsons)

    const results = db.query((q) => [
        { it: q.child, not: 'Bart' },
        { parent: 'Homer', child: q.child },
    ]).all()

    expect(results.map(x => x.child).sort()).toEqual(['Lisa', 'Maggie'])
})

it('subway route', () => {
    const db = new DB([
        { from: 'Park Street', to: 'Downtown Crossing' },
        { from: 'Downtown Crossing', to: 'South Station' },
        { from: 'Haymarket', to: 'Government Center' },
        { from: 'Government Center', to: 'Park Street' },
        { from: 'Government Center', to: 'State Street' },
        { from: 'State Street', to: 'Aquarium' },
        { from: 'State Street', to: 'Downtown Crossing' },
        (q) => [
            { from: q.from, to: q.to, link: [q.from, q.to] },
            { from: q.from, to: q.to },
        ],
        (q) => [
            { from: q.to, to: q.from, link: [q.from, q.to] },
            { from: q.from, to: q.to },
        ],
        (q) => [
            { it: q.value, not_in: [] },
        ],
        (q) => [
            { it: q.value, not_in: [q.head, q.tail] },
            { it: q.value, not: q.head },
            { it: q.value, not_in: q.tail },
        ],
        (q) => [
            { from: q.from, to: q.from, path: [] },
        ],
        (q) => [
            { from: q.from, to: q.end, path: [q.link, q.rest] },
            { from: q.from, to: q.next, link: q.link },
            { it: q.link, not_in: q.rest },
            { from: q.next, to: q.end, path: q.rest },
        ],
    ])

    // convert linked list -> array
    function unlist (list) {
        if (!list.length) { return [] }
        const [head, tail] = list
        return [head, ...unlist(tail)]
    }

    const result = db.query((q) => [
        { from: 'South Station', to: 'Aquarium', path: q.path },
    ]).one().path
    expect(unlist(result)).toEqual([
        ['Downtown Crossing', 'South Station'],
        ['State Street', 'Downtown Crossing'],
        ['State Street', 'Aquarium'],
    ])
})
