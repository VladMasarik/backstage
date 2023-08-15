/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fireEvent, render, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { MockEntityListContextProvider } from '../../testUtils/providers';
import { EntityAutocompletePicker } from './EntityAutocompletePicker';
import { TestApiProvider } from '@backstage/test-utils';
import { catalogApiRef } from '../../api';
import { CatalogApi } from '@backstage/catalog-client';
import { DefaultEntityFilters } from '../../hooks';
import { Entity } from '@backstage/catalog-model';
import { EntityFilter } from '../../types';

interface EntityFilters extends DefaultEntityFilters {
  options?: EntityOptionFilter;
}

const options = ['option1', 'option2', 'option3', 'option4'];

class EntityOptionFilter implements EntityFilter {
  constructor(readonly values: string[]) {}

  filterEntity(entity: Entity): boolean {
    return this.values.every(v =>
      ((entity.spec?.options ?? []) as string[]).includes(v),
    );
  }

  toQueryValue(): string[] {
    return this.values;
  }
}

describe('<EntityAutocompletePicker/>', () => {
  const mockCatalogApi = {
    getEntityFacets: async () => ({
      facets: {
        'spec.options': options.map((value, idx) => ({ value, count: idx })),
      },
    }),
  } as unknown as CatalogApi;

  it('renders all options', async () => {
    render(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <MockEntityListContextProvider value={{}}>
          <EntityAutocompletePicker<EntityFilters>
            label="Options"
            path="spec.options"
            name="options"
            Filter={EntityOptionFilter}
          />
        </MockEntityListContextProvider>
      </TestApiProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('Options')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('options-picker-expand'));
    options.forEach(option => {
      expect(screen.getByText(option)).toBeInTheDocument();
    });
  });

  it('renders unique options in alphabetical order', async () => {
    render(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <MockEntityListContextProvider value={{}}>
          <EntityAutocompletePicker<EntityFilters>
            label="Options"
            path="spec.options"
            name="options"
            Filter={EntityOptionFilter}
          />
        </MockEntityListContextProvider>
      </TestApiProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('Options')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('options-picker-expand'));

    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
      'option1',
      'option2',
      'option3',
      'option4',
    ]);
  });

  it('renders options with counts', async () => {
    render(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <MockEntityListContextProvider value={{}}>
          <EntityAutocompletePicker<EntityFilters>
            label="Options"
            path="spec.options"
            name="options"
            Filter={EntityOptionFilter}
            showCounts
          />
        </MockEntityListContextProvider>
      </TestApiProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('Options')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('options-picker-expand'));

    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
      'option1 (0)',
      'option2 (1)',
      'option3 (2)',
      'option4 (3)',
    ]);
  });

  it('respects the query parameter filter value', async () => {
    const updateFilters = jest.fn();
    const queryParameters = { options: ['option3'] };
    render(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <MockEntityListContextProvider<EntityFilters>
          value={{
            updateFilters,
            queryParameters,
          }}
        >
          <EntityAutocompletePicker<EntityFilters>
            label="Options"
            path="spec.options"
            name="options"
            Filter={EntityOptionFilter}
          />
        </MockEntityListContextProvider>
      </TestApiProvider>,
    );

    await waitFor(() =>
      expect(updateFilters).toHaveBeenLastCalledWith({
        options: new EntityOptionFilter(['option3']),
      }),
    );
  });

  it('adds options to filters', async () => {
    const updateFilters = jest.fn();
    render(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <MockEntityListContextProvider
          value={{
            updateFilters,
          }}
        >
          <EntityAutocompletePicker<EntityFilters>
            label="Options"
            path="spec.options"
            name="options"
            Filter={EntityOptionFilter}
          />
        </MockEntityListContextProvider>
      </TestApiProvider>,
    );
    await waitFor(() =>
      expect(updateFilters).toHaveBeenLastCalledWith({
        options: undefined,
      }),
    );

    fireEvent.click(screen.getByTestId('options-picker-expand'));
    fireEvent.click(screen.getByText('option1'));
    expect(updateFilters).toHaveBeenLastCalledWith({
      options: new EntityOptionFilter(['option1']),
    });
  });

  it('removes options from filters', async () => {
    const updateFilters = jest.fn();
    render(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <MockEntityListContextProvider<EntityFilters>
          value={{
            updateFilters,
            filters: { options: new EntityOptionFilter(['option1']) },
          }}
        >
          <EntityAutocompletePicker<EntityFilters>
            label="Options"
            path="spec.options"
            name="options"
            Filter={EntityOptionFilter}
          />
        </MockEntityListContextProvider>
      </TestApiProvider>,
    );
    await waitFor(() =>
      expect(updateFilters).toHaveBeenLastCalledWith({
        options: new EntityOptionFilter(['option1']),
      }),
    );
    fireEvent.click(screen.getByTestId('options-picker-expand'));
    expect(screen.getByLabelText('option1')).toBeChecked();

    fireEvent.click(screen.getByLabelText('option1'));
    expect(updateFilters).toHaveBeenLastCalledWith({
      options: undefined,
    });
  });

  it('responds to external queryParameters changes', async () => {
    const updateFilters = jest.fn();
    const rendered = render(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <MockEntityListContextProvider<EntityFilters>
          value={{
            updateFilters,
            queryParameters: { options: ['option1'] },
          }}
        >
          <EntityAutocompletePicker<EntityFilters>
            label="Options"
            path="spec.options"
            name="options"
            Filter={EntityOptionFilter}
          />
        </MockEntityListContextProvider>
      </TestApiProvider>,
    );
    await waitFor(() =>
      expect(updateFilters).toHaveBeenLastCalledWith({
        options: new EntityOptionFilter(['option1']),
      }),
    );
    rendered.rerender(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <MockEntityListContextProvider<EntityFilters>
          value={{
            updateFilters,
            queryParameters: { options: ['option2'] },
          }}
        >
          <EntityAutocompletePicker<EntityFilters>
            label="Options"
            path="spec.options"
            name="options"
            Filter={EntityOptionFilter}
          />
        </MockEntityListContextProvider>
      </TestApiProvider>,
    );
    expect(updateFilters).toHaveBeenLastCalledWith({
      options: new EntityOptionFilter(['option2']),
    });
  });
});
