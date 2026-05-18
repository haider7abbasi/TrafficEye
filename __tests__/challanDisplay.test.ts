import { violationLabelsFromIds } from '../src/services/challanDisplay';

describe('challanDisplay', () => {
  it('maps spec violation ids to labels', () => {
    expect(violationLabelsFromIds(['no_helmet', 'mobile_phone_use'])).toEqual([
      'Riding without helmet',
      'Mobile phone use while driving',
    ]);
  });
});
