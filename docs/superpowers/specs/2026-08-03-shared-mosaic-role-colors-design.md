# Shared Mosaic Role Colors Design

## Goal

Circle과 Square 모자이크도 M·O·E 모자이크와 동일한 세 가지 역할 색을 사용한다.

## Behavior

- 영상 밝기를 기존 M·O·E 임계값과 같은 세 구간으로 나눈다.
- 어두운 구간은 E 색, 중간 구간은 O 색, 밝은 구간은 M 색을 사용한다.
- M·O·E, Circle, Square 모두 같은 색 선택 결과를 공유한다.
- Circle과 Square의 밝기 기반 크기 변화, Scale, Spacing, Kick 반응은 유지한다.
- 팔레트 버튼을 바꾸면 세 패턴의 역할 색이 함께 바뀐다.

## Scope

셰이더의 역할 색 선택 순서와 해당 회귀 테스트만 변경한다. UI 구조와 재생 로직은 변경하지 않는다.

## Verification

- 셰이더 테스트에서 도형 모드가 단일 색으로 덮어쓰지 않는지 확인한다.
- 전체 테스트와 프로덕션 빌드를 실행한다.
- 브라우저에서 Circle과 Square가 세 색을 사용하며 영상 윤곽을 유지하는지 확인한다.
