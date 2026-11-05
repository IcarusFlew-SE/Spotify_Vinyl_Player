import { describe, it, expect } from 'vitest';
import { LruCache } from './lru.js';

describe('LruCache', () => {
  it('evicts the least recently used entry, not the oldest added', () => {
    const c = new LruCache(2);
    c.set('a', 1).set('b', 2);
    c.get('a'); // a is now the most recent
    c.set('c', 3);
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
    expect(c.size).toBe(2);
  });

  it('expires entries after the TTL', () => {
    let t = 0;
    const c = new LruCache(5, 100, () => t);
    c.set('a', 1);
    t = 100;
    expect(c.get('a')).toBe(1);
    t = 201;
    expect(c.get('a')).toBeUndefined();
    expect(c.size).toBe(0);
  });

  it('keeps null values as real entries', () => {
    const c = new LruCache(2);
    c.set('none', null);
    expect(c.get('none')).toBeNull();
    expect(c.has('none')).toBe(true);
  });
});
