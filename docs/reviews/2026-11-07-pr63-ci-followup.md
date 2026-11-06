# PR 63 CI followup

The first full CI run passed the build, container verification, workspace unit tests, API tests, and browser smoke tests. Its fixture suite reported 294 passes, two skips, and 16 failures. Six failures were older light palette expectations, four were insufficient contrast in landing empty and error headings, and six exceeded the unchanged editor CSS budgets.

The landing palette now maps canonical shared color properties as well as the legacy aliases. Shared Status headings and legal dialog chrome therefore use the requested dark theme with readable text. Presentation assertions now expect the approved burgundy palette and existing four pixel landing focus offset. Navigation, keyboard actions, dialog focus return, and recovery assertions remain in place.

The build combined the illustration stylesheet with shared route CSS, adding it to editor responses. Loading LetterStillLife through a default SSR dynamic boundary isolates its 7,220 byte stylesheet while retaining server markup, static artwork, and no JavaScript rendering. Moving individual utility styles did not resolve the budget and was reverted. Historical CSS and JavaScript baselines were not changed.
