import MetricsEvent from '../src/MetricsEvent';

describe('core/MetricsEvent', () => {
  it('can be created easily', () => {
    const event = new MetricsEvent('mytestlib', 'name of this test');

    expect(event.lib).toBe('mytestlib');
    expect(event.context).toBe('name of this test');
    expect(event.contextId).toBeTruthy();
  });

  it('can be created with a custom id', () => {
    const event = new MetricsEvent('mytestlib', 'name of this test', 'id');

    expect(event.lib).toBe('mytestlib');
    expect(event.context).toBe('name of this test');
    expect(event.contextId).toBe('id');
  });

  it('can generate proper headers', () => {
    const event = new MetricsEvent('mytestlib', 'name of this test', 'id');

    const headers = event.getHeaders();
    expect(headers).toBeTruthy();
    expect(headers[0]).toEqual(['carto-source-lib', 'mytestlib']);
    expect(headers[1]).toEqual(['carto-source-context', 'name of this test']);
    expect(headers[2]).toEqual(['carto-source-context-id', 'id']);
  });
});
